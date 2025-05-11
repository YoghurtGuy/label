import EventEmitter from "events";
import path from "path";

import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

// import { type DatasetType, type ImportMethod } from "@/types/dataset";

import { env } from "@/env";
import { type statsWithDatasetId } from "@/types/dataset";
import type { ImportProgress } from "@/types/import";
import { getFolderTree, getAistImages } from "@/utils/alist";
import { getDirectoryTree } from "@/utils/fileSystem";
import { getImagesFromDirectory } from "@/utils/image";
// import logger from "@/utils/logger";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// const datasetLogger = logger.child({ name: "DATASET" });
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
      try {
        const serverTree = env.IS_ON_VERCEL
          ? []
          : getDirectoryTree(
              path.join(env.SERVER_IMAGES_DIR, input.path),
              input.maxDepth,
            );
        const alistTree = env.ALIST_TOKEN&&env.ALIST_URL
          ? await getFolderTree(input.path)
          : [];
        return serverTree.concat(alistTree);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取目录树失败",
          cause: error,
        });
      }
    }),

  // 获取数据集数量
  getCount: protectedProcedure.query(async ({ ctx }) => {
    const mineCount = await ctx.db.dataset.count({
      where: { createdById: ctx.session.user.id },
    });
    const allCount = await ctx.db.dataset.count();
    return {
      mine: mineCount,
      all: allCount,
    };
  }),
  // 获取数据集列表
  getAll: protectedProcedure
    .input(
      z.object({
        pageSize: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { pageSize, page } = input;
      const items = await ctx.db.dataset.findMany({
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          labels: true,
        },
      });
      const rawStats = await ctx.db.$queryRaw<statsWithDatasetId[]>`
        SELECT d.ID AS "datasetId",COUNT(DISTINCT i.ID) AS "imageCount",COUNT(DISTINCT CASE WHEN A."createdById" IS NOT NULL THEN i.ID END) AS "annotatedImageCount",COUNT(CASE WHEN A."createdById" IS NOT NULL THEN 1 END) AS "annotationCount",COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM "Annotation" a3 WHERE a3."imageId"=i.ID AND a3."createdById" IS NULL) THEN i.ID END) AS "preAnnotatedImageCount" FROM "Dataset" d LEFT JOIN "Image" i ON i."datasetId"=d.ID AND i."deleteById" IS NULL LEFT JOIN "Annotation" A ON A."imageId"=i.ID GROUP BY d.ID ORDER BY d."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `;
      const itemsWithStats = items.map((item) => ({
        ...item,
        stats: rawStats.find((stats) => stats.datasetId === item.id),
      }));
      return itemsWithStats;
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
              taskOnImage: true,
              annotations: {
                where: {
                  createdById: {
                    not: null,
                  },
                },
              },
            },
            orderBy: {
              order: "asc",
            },
            where: {
              deleteById: null,
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
      dataset.images.forEach((image) => {
        if (!image.annotations.length) {
          unannotatedImageIndex.push(image.order);
        }
        if (!image.taskOnImage.length) {
          unassignedImageIndex.push(image.order);
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
        prompts: z.string().optional().nullable(),
        importMethod: z.enum(["BROWSER_UPLOAD", "SERVER_FOLDER"]),
        serverPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { labels, importMethod, serverPath, prompts, ...datasetData } =
        input;

      // 创建数据集
      const dataset = await ctx.db.dataset.create({
        data: {
          name: datasetData.name,
          description: datasetData.description,
          type: datasetData.type,
          createdById: ctx.session.user.id,
          prompts: prompts,
          labels: {
            create: labels,
          },
        },
        include: {
          labels: true,
        },
      });

      // 处理图像导入
      if (importMethod === "SERVER_FOLDER" && serverPath) {
        try {
          // 获取目录中的所有图像文件
          const imageFiles = serverPath.startsWith("web:")
            ? await getAistImages(serverPath.slice(4))
            : env.IS_ON_VERCEL
              ? []
              : await getImagesFromDirectory(serverPath);

          // const totalFiles = imageFiles.length;
          // let processedCount = 0;
          // const failedFiles: string[] = [];
          await ctx.db.image.createMany({
            data: imageFiles.map((image, index) => ({
              ...image,
              order: index,
              datasetId: dataset.id,
              storage: serverPath.startsWith("web:") ? "WEB" : "SERVER",
            })),
          });

          //   // 发送开始处理的进度信息
          //   progressEmitter.emit("progress", {
          //     datasetId: dataset.id,
          //     total: totalFiles,
          //     processed: processedCount,
          //     currentFile: "",
          //     status: "processing",
          //   } as ImportProgress);

          //   // 逐个处理图像文件
          //   for (const imageFile of imageFiles) {
          //     try {
          //       const metadata = await getImageMetadata(imageFile.path);

          //       // 创建图像记录
          //       await ctx.db.image.create({
          //         data: {
          //           filename: imageFile.filename,
          //           path: path.relative(env.SERVER_IMAGES_DIR ?? '', imageFile.path),
          //           width: metadata.width,
          //           height: metadata.height,
          //           datasetId: dataset.id,
          //         },
          //       });

          //       processedCount++;
          //       // 发出进度更新事件
          //       progressEmitter.emit("progress", {
          //         datasetId: dataset.id,
          //         total: totalFiles,
          //         processed: processedCount,
          //         currentFile: imageFile.filename,
          //         status: "processing",
          //       } as ImportProgress);
          //     } catch (error) {
          //       // datasetLogger.error(`处理图像失败: ${imageFile.path}`, error);
          //       console.error(`处理图像失败: ${imageFile.path}`, error);
          //       failedFiles.push(imageFile.filename);
          //       continue;
          //     }
          //   }

          //   // 发送完成处理的进度信息
          //   progressEmitter.emit("progress", {
          //     datasetId: dataset.id,
          //     total: totalFiles,
          //     processed: processedCount,
          //     currentFile: "",
          //     status: "completed",
          //   } as ImportProgress);
        } catch (error) {
          //   // 发送错误信息
          //   progressEmitter.emit("progress", {
          //     datasetId: dataset.id,
          //     total: 0,
          //     processed: 0,
          //     currentFile: "",
          //     status: "error",
          //     error: error instanceof Error ? error.message : "导入图像时出错",
          //   } as ImportProgress);

          // 如果导入失败，删除已创建的数据集
          await ctx.db.dataset.delete({
            where: { id: dataset.id },
          });
          // datasetLogger.error("导入图像失败", error);
          console.error("导入图像失败", error);
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
        prompts: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, labels, ...data } = input;

      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id,
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
      if (dataset.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权限更新数据集",
        });
      }

      // 更新数据集基本信息
      await ctx.db.dataset.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          prompts: data.prompts,
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
      try {
        const dataset = await ctx.db.dataset.findFirst({
          where: {
            id: input,
          },
        });

        if (!dataset) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "数据集不存在",
          });
        }
        if (dataset.createdById !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "无权限删除数据集",
          });
        }

        await ctx.db.$transaction(async (tx) => {
          await tx.label.deleteMany({
            where: { datasetId: input },
          });
          await tx.annotation.deleteMany({
            where: { image: { datasetId: input } },
          });
          await tx.taskOnImage.deleteMany({
            where: { image: { datasetId: input } },
          });
          await tx.image.deleteMany({
            where: { datasetId: input },
          });
          await tx.annotationTask.deleteMany({
            where: { datasetId: input },
          });
          await tx.dataset.delete({
            where: { id: input },
          });

          return { success: true };
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "删除数据集失败",
          cause: error,
        });
      }
    }),
});

export default datasetRouter;
