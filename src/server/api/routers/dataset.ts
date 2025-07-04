import EventEmitter from "events";
import path from "path";

import type { AnnotationStatus, AnnotationType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

// import { type DatasetType, type ImportMethod } from "@/types/dataset";

import { env } from "@/env";
import { type statsWithDatasetId } from "@/types/dataset";
import type { ImportProgress } from "@/types/import";
import {
  getFolderTree as getAlistFolderTree,
  getImages as getAlistImages,
} from "@/utils/alist";
import { getDirectoryTree } from "@/utils/fileSystem";
import { getImagesFromDirectory } from "@/utils/image";
import {
  getFolderTree as getS3FolderTree,
  getImages as getS3Images,
} from "@/utils/s3";
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
        const serverTree = getDirectoryTree(
          path.join(env.SERVER_IMAGES_DIR, input.path),
          input.maxDepth,
        );
        const alistTree = await getAlistFolderTree(input.path);
        const s3Tree = await getS3FolderTree();
        return serverTree.concat(alistTree).concat(s3Tree);
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
          // createdById: ctx.session.user.id,
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
        serverPath: z.array(z.string()),
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
      if (importMethod === "SERVER_FOLDER" && serverPath.length > 0) {
        try {
          for (const p of serverPath) {
            // 获取目录中的所有图像文件
            const imageFiles = p.startsWith("web:")
              ? await getAlistImages(p.slice(4))
              : p.startsWith("s3:")
                ? await getS3Images(p.slice(3))
                : env.IS_ON_VERCEL
                  ? []
                  : await getImagesFromDirectory(p);

            // const totalFiles = imageFiles.length;
            // let processedCount = 0;
            // const failedFiles: string[] = [];
            await ctx.db.image.createMany({
              data: imageFiles.map((image, index) => ({
                ...image,
                order: index,
                datasetId: dataset.id,
                storage: p.startsWith("web:")
                  ? "WEB"
                  : p.startsWith("s3:")
                    ? "S3"
                    : "SERVER",
              })),
            });
          }
        } catch (error) {
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
        preAnnotation: z
          .array(
            z.object({
              imageurl: z.string(),
              output: z.string(),
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
      if (input.preAnnotation) {
        try {
          // 解析每行JSON并提取所需字段
          const annotations = input.preAnnotation
            .map((data) => {
              try {
                // 处理 output 字符串，删除最前面的 ```markdown\n 和最后面的 \n```
                let processedOutput = data.output ?? "";
                if (processedOutput.startsWith("```markdown\n")) {
                  processedOutput = processedOutput.substring(
                    "```markdown\n".length,
                  );
                }
                if (processedOutput.endsWith("\n```")) {
                  processedOutput = processedOutput.substring(
                    0,
                    processedOutput.length - "\n```".length,
                  );
                }

                return {
                  imageUrl: data.imageurl ?? "",
                  text: processedOutput,
                };
              } catch (error) {
                console.error("解析JSON行失败:", error);
                return null;
              }
            })
            .filter(Boolean);

          // 一次性查出所有相关 image
          const images = await ctx.db.image.findMany({
            where: {
              datasetId: dataset.id,
            },
          });

          // 构建 path -> imageId 的映射
          const imageMap = new Map<string, (typeof images)[0]>();
          for (const image of images) {
            imageMap.set(image.path, image);
          }
          const annotationsToCreate = [];

          for (const annotation of annotations) {
            if (!annotation) continue;
            const matchedImage = [...imageMap.values()].find((image) =>
              image.path.includes(annotation.imageUrl),
            );

            if (matchedImage) {
              annotationsToCreate.push({
                type: "OCR" as AnnotationType,
                text: annotation.text,
                status: "PENDING" as AnnotationStatus,
                imageId: matchedImage.id,
              });
            }
          }

          if (annotationsToCreate.length > 0) {
            await ctx.db.annotation.createMany({
              data: annotationsToCreate,
            });
          }
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "处理预标注文件失败",
            cause: error,
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
