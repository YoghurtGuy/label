import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { distributeImagesToUsers } from "@/utils/array";
import { getImageSrc } from "@/utils/image";

export const taskRouter = createTRPCRouter({
  // 获取任务数量
  getCount: protectedProcedure.query(async ({ ctx }) => {
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
        type: z.enum(["assigned", "created"]).default("assigned"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.annotationTask.findMany({
        take: input.pageSize,
        where:
          input.type === "created"
            ? { creatorId: ctx.session.user.id }
            : { assignedToId: ctx.session.user.id },
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
          (toi) =>
            toi.image.annotations.filter(
              (a) => a.createdById == task.assignedToId,
            ).length > 0,
        ).length;

        // 获取标注总数
        const annotationCount = task.taskOnImage.reduce(
          (total, toi) =>
            total +
            toi.image.annotations.filter(
              (a) => a.createdById == task.assignedToId,
            ).length,
          0,
        );

        return {
          ...task,
          taskOnImage: undefined,
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
          // taskOnImage: {
          //   include: {
          //     image: {
          //       include: {
          //         annotations: true,
          //       },
          //     },
          //   },
          // },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在",
        });
      }

      // 添加统计信息
      // const imageCount = task.taskOnImage.length;
      // const annotatedImageCount = task.taskOnImage.filter(
      //   (toi) => toi.image.annotations.length > 0,
      // ).length;
      // const annotationCount = task.taskOnImage.reduce(
      //   (total, toi) => total + toi.image.annotations.length,
      //   0,
      // );

      // return {
      //   ...task,
      //   stats: {
      //     imageCount,
      //     annotatedImageCount,
      //     annotationCount,
      //   },
      // };
      return task;
    }),

  // 创建任务
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        datasetId: z.string(),
        assignedTo: z.array(z.string()),
        indexRange: z.array(z.number()).min(2).max(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, datasetId, assignedTo, indexRange } = input;

      // 检查数据集是否存在
      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id: datasetId,
        },
        include: {
          images: {
            orderBy: {
              order: "asc",
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

      // 检查索引范围是否有效
      const startIndex = indexRange[0];
      const endIndex = indexRange[1];
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
      const images = dataset.images.filter(
        (image) =>
          image.order >= startIndex &&
          image.order <= endIndex &&
          image.deleteById === null,
      );
      // 平均随机分配图像
      const assignedImages = distributeImagesToUsers(
        images.map((image) => image.id),
        assignedTo,
      );
      const createTaskPromises = Object.entries(assignedImages).map(
        ([userId, imageUrls]) =>
          ctx.db.annotationTask.create({
            data: {
              name,
              description,
              creatorId: ctx.session.user.id,
              assignedToId: userId,
              datasetId,
              taskOnImage: {
                create: imageUrls.map((imageId) => ({
                  imageId,
                })),
              },
            },
          }),
      );
      return await Promise.all(createTaskPromises);
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
          deleteById: null,
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
          src: getImageSrc(image),
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
  getLastAnnotatedImage: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const annotation = await ctx.db.annotation.findFirst({
        where: {
          createdById: ctx.session.user.id,
          image: {
            taskOnImage: {
              some: {
                taskId: input,
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return annotation?.imageId ?? null;
    }),
  getRank: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: {
        OR: [{ assignedTasks: { some: {} } }, { annotations: { some: {} } }],
      },
      select: {
        id: true,
        name: true,
        assignedTasks: {
          select: {
            taskOnImage: {
              select: {
                imageId: true,
              },
            },
          },
        },
        annotations: {
          select: {
            imageId: true,
          },
        },
      },
    });

    const rank = users
      .map((user) => {
        // 计算分配的总图像数（去重）
        const assignedImages = new Set(
          user.assignedTasks.flatMap((task) =>
            task.taskOnImage.map((toi) => toi.imageId),
          ),
        );

        // 计算已标注的图像数（去重）
        const annotatedImages = new Set(user.annotations.map((a) => a.imageId));

        const assignedCount = assignedImages.size;
        const annotatedCount = annotatedImages.size;

        return {
          id: user.id,
          name: user.name,
          annotatedImageCount: annotatedCount,
          assignedImageCount: assignedCount,
          progress: assignedCount > 0 ? annotatedCount / assignedCount : 0,
        };
      })
      .filter((user) => user.assignedImageCount > 0) // 只保留有分配任务的用户
      .sort((a, b) => {
        if (b.annotatedImageCount !== a.annotatedImageCount) {
          return b.annotatedImageCount - a.annotatedImageCount;
        }
        return b.progress - a.progress;
      });

    return rank;
  }),
});
