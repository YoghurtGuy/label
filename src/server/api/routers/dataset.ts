import EventEmitter from "events";
import path from "path";

import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

// import { type DatasetType, type ImportMethod } from "@/types/dataset";

import { env } from "@/env";
import type { ImportProgress } from "@/types/import";
import { getDirectoryTree } from "@/utils/fileSystem";
import { getImagesFromDirectory, getImageMetadata } from "@/utils/image";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// 创建一个事件发射器来处理进度更新
const progressEmitter = new EventEmitter();

const datasetRouter = createTRPCRouter({
  // 获取目录树
  getDirectoryTree: protectedProcedure
    .input(
      z.object({
        path: z.string(),
        maxDepth: z.number().min(1).max(5).default(3),
      }),
    )
    .query(async ({ input }) => {
      // 检查是否配置了服务器图像目录
      if (!env.SERVER_IMAGES_DIR) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "服务器图像目录未配置",
        });
      }
      try {
        const fullPath = path.join(env.SERVER_IMAGES_DIR, input.path);
        const tree = getDirectoryTree(fullPath, input.maxDepth);
        return tree;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取目录树失败",
          cause: error,
        });
      }
    }),

  // 获取数据集列表
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const items = await ctx.db.dataset.findMany({
        take: limit + 1,
        where: {
          createdById: ctx.session.user.id,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          labels: true,
          images: {
            include: {
              annotations: true,
            },
          },
        },
      });

      // 处理每个数据集，添加统计信息
      const itemsWithStats = await Promise.all(
        items.map(async (dataset) => {
          // 获取图像总数
          const imageCount = dataset.images.length;

          // 获取已标注的图像数量（有标注的图像）
          const annotatedImageCount = dataset.images.filter(
            (image) => image.annotations.length > 0,
          ).length;

          // 获取标注总数
          const annotationCount = dataset.images.reduce(
            (total, image) => total + image.annotations.length,
            0,
          );

          return {
            ...dataset,
            stats: {
              imageCount,
              annotatedImageCount,
              annotationCount,
            },
          };
        }),
      );

      let nextCursor: typeof cursor | undefined = undefined;
      if (itemsWithStats.length > limit) {
        const nextItem = itemsWithStats.pop();
        nextCursor = nextItem!.id;
      }
      return {
        items: itemsWithStats,
        nextCursor,
      };
    }),

  // 获取单个数据集
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id: input,
          createdById: ctx.session.user.id,
        },
        include: {
          labels: true,
          images: {
            include: {
              annotations: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "数据集不存在",
        });
      }

      // 添加序号信息
      const unassignedImageIndex: number[] = [];
      const unannotatedImageIndex: number[] = [];
      dataset.images.forEach((image, index) => {
        if (!image.annotations.length) {
          unannotatedImageIndex.push(index);
        }
        if (!image.taskId) {
          unassignedImageIndex.push(index);
        }
      });
      return {
        ...dataset,
        index: {
          unassigned: unassignedImageIndex,
          unannotated: unannotatedImageIndex,
        },
        imageCount: dataset.images.length,
      };
    }),

  // 创建数据集
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        type: z.enum(["OBJECT_DETECTION", "OCR"]),
        labels: z.array(
          z.object({
            name: z.string(),
            color: z.string(),
            description: z.string().optional().nullable(),
          }),
        ),
        importMethod: z.enum(["BROWSER_UPLOAD", "SERVER_FOLDER"]),
        serverPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { labels, importMethod, serverPath, ...datasetData } = input;

      // 创建数据集
      const dataset = await ctx.db.dataset.create({
        data: {
          name: datasetData.name,
          description: datasetData.description,
          type: datasetData.type,
          createdById: ctx.session.user.id,
        },
        include: {
          labels: true,
        },
      });

      // 创建标签
      if (labels.length > 0) {
        await ctx.db.label.createMany({
          data: labels.map((label) => ({
            ...label,
            datasetId: dataset.id,
          })),
        });
      }

      // 处理图像导入
      if (importMethod === "SERVER_FOLDER" && serverPath) {
        try {
          // 获取目录中的所有图像文件
          const imageFiles = await getImagesFromDirectory(serverPath);
          const totalFiles = imageFiles.length;
          let processedCount = 0;
          const failedFiles: string[] = [];

          // 发送开始处理的进度信息
          progressEmitter.emit("progress", {
            datasetId: dataset.id,
            total: totalFiles,
            processed: processedCount,
            currentFile: "",
            status: "processing",
          } as ImportProgress);

          // 逐个处理图像文件
          for (const imageFile of imageFiles) {
            try {
              const metadata = await getImageMetadata(imageFile.path);

              // 创建图像记录
              await ctx.db.image.create({
                data: {
                  filename: imageFile.filename,
                  path: imageFile.path,
                  width: metadata.width,
                  height: metadata.height,
                  datasetId: dataset.id,
                },
              });

              processedCount++;
              // 发出进度更新事件
              progressEmitter.emit("progress", {
                datasetId: dataset.id,
                total: totalFiles,
                processed: processedCount,
                currentFile: imageFile.filename,
                status: "processing",
              } as ImportProgress);
            } catch (error) {
              console.error(`处理图像失败: ${imageFile.path}`, error);
              failedFiles.push(imageFile.filename);
              continue;
            }
          }

          // 发送完成处理的进度信息
          progressEmitter.emit("progress", {
            datasetId: dataset.id,
            total: totalFiles,
            processed: processedCount,
            currentFile: "",
            status: "completed",
          } as ImportProgress);
        } catch (error) {
          // 发送错误信息
          progressEmitter.emit("progress", {
            datasetId: dataset.id,
            total: 0,
            processed: 0,
            currentFile: "",
            status: "error",
            error: error instanceof Error ? error.message : "导入图像时出错",
          } as ImportProgress);

          // 如果导入失败，删除已创建的数据集
          await ctx.db.dataset.delete({
            where: { id: dataset.id },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "导入图像时出错",
          });
        }
      }

      // 返回更新后的数据集（包含标签和图像）
      return await ctx.db.dataset.findUnique({
        where: { id: dataset.id },
        include: {
          labels: true,
          images: true,
        },
      });
    }),

  // 订阅导入进度
  onImportProgress: protectedProcedure
    .input(z.string())
    .subscription(({ input: datasetId }) => {
      return observable<ImportProgress>((emit) => {
        const onProgress = (progress: ImportProgress) => {
          if (progress.datasetId === datasetId) {
            emit.next(progress);
          }
        };

        progressEmitter.on("progress", onProgress);

        return () => {
          progressEmitter.off("progress", onProgress);
        };
      });
    }),

  // 更新数据集
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        type: z.enum(["OBJECT_DETECTION", "OCR"]).optional(),
        labels: z
          .array(
            z.object({
              name: z.string(),
              color: z.string(),
              description: z.string().optional().nullable(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, labels, ...data } = input;

      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id,
          createdById: ctx.session.user.id,
        },
        include: {
          labels: true,
        },
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "数据集不存在",
        });
      }

      // 更新数据集基本信息
      await ctx.db.dataset.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
        },
        include: {
          labels: true,
        },
      });

      // 更新标签
      if (labels) {
        // 删除现有标签
        await ctx.db.label.deleteMany({
          where: { datasetId: id },
        });

        // 创建新标签
        if (labels.length > 0) {
          await ctx.db.label.createMany({
            data: labels.map((label) => ({
              ...label,
              datasetId: id,
            })),
          });
        }
      }

      // 返回更新后的数据集（包含标签）
      return await ctx.db.dataset.findUnique({
        where: { id },
        include: { labels: true },
      });
    }),

  // 删除数据集
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id: input,
          createdById: ctx.session.user.id,
        },
      });

      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "数据集不存在",
        });
      }

      await ctx.db.dataset.delete({
        where: { id: input },
      });

      return { success: true };
    }),
});

export default datasetRouter;
