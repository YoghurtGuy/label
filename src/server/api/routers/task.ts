import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const taskRouter = createTRPCRouter({
  // 获取任务数量
  getCount: protectedProcedure
    .query(async ({ ctx }) => {
      const assignedCount = await ctx.db.annotationTask.count({
        where: {
          assignedToId: ctx.session.user.id,
        },
      });
      const createdCount = await ctx.db.annotationTask.count({
        where: {
          creatorId: ctx.session.user.id,
        },
      });
      return {
        assigned: assignedCount,
        created: createdCount,
      };
    }),

  // 获取任务列表
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.annotationTask.findMany({
        take: input.pageSize,
        where: {
          OR: [
            { creatorId: ctx.session.user.id },
            { assignedToId: ctx.session.user.id },
          ],
        },
        skip: (input.page - 1) * input.pageSize,
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
          taskOnImage: {
            include: {
              image: {
                include: {
                  annotations: true,
                },
              },
            },
          },
        },
      });

      // 处理每个任务，添加统计信息
      const itemsWithStats = tasks.map((task) => {
        // 获取图像总数
        const imageCount = task.taskOnImage.length;

        // 获取已标注的图像数量（有标注的图像）
        const annotatedImageCount = task.taskOnImage.filter(
          (toi) => toi.image.annotations.length > 0,
        ).length;

        // 获取标注总数
        const annotationCount = task.taskOnImage.reduce(
          (total, toi) => total + toi.image.annotations.length,
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

      return itemsWithStats;
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
          taskOnImage: {
            include: {
              image: {
                include: {
                  annotations: true,
                },
              },
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
      const imageCount = task.taskOnImage.length;
      const annotatedImageCount = task.taskOnImage.filter(
        (toi) => toi.image.annotations.length > 0,
      ).length;
      const annotationCount = task.taskOnImage.reduce(
        (total, toi) => total + toi.image.annotations.length,
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
              creatorId: ctx.session.user.id,
              assignedToId: assign.userId,
              datasetId,
              taskOnImage: {
                create: images.map((image) => ({
                  imageId: image.id,
                })),
              },
            },
            // include: {
            //   creator: {
            //     select: {
            //       id: true,
            //       name: true,
            //     },
            //   },
            //   assignedTo: {
            //     select: {
            //       id: true,
            //       name: true,
            //     },
            //   },
            //   dataset: {
            //     select: {
            //       id: true,
            //       name: true,
            //       type: true,
            //     },
            //   },
            //   taskOnImage: true,
            // },
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, datasetId, assignedToId } = input;

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
  // updateStatus: protectedProcedure
  //   .input(
  //     z.object({
  //       id: z.string(),
  //       status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REVIEWING"]),
  //     }),
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { id, status } = input;

  //     const task = await ctx.db.annotationTask.findFirst({
  //       where: {
  //         id,
  //         OR: [
  //           { creatorId: ctx.session.user.id },
  //           { assignedToId: ctx.session.user.id },
  //         ],
  //       },
  //     });

  //     if (!task) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "任务不存在",
  //       });
  //     }

  //     // 更新任务状态
  //     const updatedTask = await ctx.db.annotationTask.update({
  //       where: { id },
  //       data: { status },
  //       include: {
  //         creator: {
  //           select: {
  //             id: true,
  //             name: true,
  //           },
  //         },
  //         assignedTo: {
  //           select: {
  //             id: true,
  //             name: true,
  //           },
  //         },
  //         dataset: {
  //           select: {
  //             id: true,
  //             name: true,
  //             type: true,
  //           },
  //         },
  //       },
  //     });

  //     return updatedTask;
  //   }),

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
      await ctx.db.$transaction(async (tx) => {
        await tx.taskOnImage.deleteMany({
          where: {
            taskId: input,
          },
        });
        await tx.annotationTask.delete({
          where: { id: input },
        });
      });

      return { success: true };
    }),
  getImageListById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const images = await ctx.db.image.findMany({
        where: {
          taskOnImage: {
            some: {
              taskId: input,
            },
          },
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
