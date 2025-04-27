import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const taskRouter = createTRPCRouter({
  // 获取任务列表
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const items = await ctx.db.annotationTask.findMany({
        take: limit + 1,
        where: {
          OR: [
            { creatorId: ctx.session.user.id },
            { assignedToId: ctx.session.user.id },
          ],
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          dataset: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          images: {
            include: {
              annotations: true,
            },
          },
        },
      });

      // 处理每个任务，添加统计信息
      const itemsWithStats = items.map((task) => {
        // 获取图像总数
        const imageCount = task.images.length;

        // 获取已标注的图像数量（有标注的图像）
        const annotatedImageCount = task.images.filter(
          (image) => image.annotations.length > 0,
        ).length;

        // 获取标注总数
        const annotationCount = task.images.reduce(
          (total, image) => total + image.annotations.length,
          0,
        );

        return {
          ...task,
          stats: {
            imageCount,
            annotatedImageCount,
            annotationCount,
          },
        };
      });

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

  // 获取单个任务
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id: input,
          OR: [
            { creatorId: ctx.session.user.id },
            { assignedToId: ctx.session.user.id },
          ],
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          dataset: {
            select: {
              id: true,
              name: true,
              type: true,
              labels: true,
            },
          },
          images: {
            include: {
              annotations: true,
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }

      // 添加统计信息
      const imageCount = task.images.length;
      const annotatedImageCount = task.images.filter(
        (image) => image.annotations.length > 0,
      ).length;
      const annotationCount = task.images.reduce(
        (total, image) => total + image.annotations.length,
        0,
      );

      return {
        ...task,
        stats: {
          imageCount,
          annotatedImageCount,
          annotationCount,
        },
      };
    }),

  // 创建任务
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        datasetId: z.string(),
        assignedTo: z.array(
          z.object({
            userId: z.string(),
            indexRange: z.array(z.number()).min(2).max(2),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, datasetId, assignedTo } = input;

      // 检查数据集是否存在
      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id: datasetId,
        },
        include: {
          images: {
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
      if (dataset.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权限创建任务",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        for (const assign of assignedTo) {
          // 检查索引范围是否有效
          const startIndex = assign.indexRange[0];
          const endIndex = assign.indexRange[1];
          if (
            startIndex === undefined ||
            endIndex === undefined ||
            startIndex < 0 ||
            endIndex >= dataset.images.length ||
            startIndex > endIndex
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "图像索引范围无效",
            });
          }
          // 获取指定范围的图像
          const images = dataset.images.slice(startIndex, endIndex + 1);
          // 创建任务
          await tx.annotationTask.create({
            data: {
              name,
              description,
              status: "PENDING",
              creatorId: ctx.session.user.id,
              assignedToId: assign.userId,
              datasetId,
              images: {
                connect: images.map((image) => ({ id: image.id })),
              },
            },
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                },
              },
              dataset: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              images: true,
            },
          });
        }
      });

      return true;
    }),

  // 更新任务
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string(),
        datasetId: z.string(),
        assignedToId: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REVIEWING"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, datasetId, assignedToId, status } = input;

      // 检查任务是否存在
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id,
          creatorId: ctx.session.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }

      // 更新任务
      const updatedTask = await ctx.db.annotationTask.update({
        where: { id },
        data: {
          name,
          description,
          datasetId,
          assignedToId,
          status,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          dataset: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      return updatedTask;
    }),

  // 更新任务状态
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REVIEWING"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status } = input;

      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id,
          OR: [
            { creatorId: ctx.session.user.id },
            { assignedToId: ctx.session.user.id },
          ],
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }

      // 更新任务状态
      const updatedTask = await ctx.db.annotationTask.update({
        where: { id },
        data: { status },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          dataset: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      return updatedTask;
    }),

  // 删除任务
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id: input,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }
      if (task.creatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权限删除任务",
        });
      }

      await ctx.db.annotationTask.delete({
        where: { id: input },
      });

      return { success: true };
    }),
  getImageListById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const images = await ctx.db.image.findMany({
        where: {
          taskId: input,
        },
        include: {
          annotations: true,
        },
      });
      const imagesWithAnnotationCount = images.map((image) => {
        const annotationCount = image.annotations.length;
        return {
          ...image,
          annotationCount,
        };
      });

      if (!images || images.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "找不到图像",
        });
      }

      return imagesWithAnnotationCount;
    }),
});
