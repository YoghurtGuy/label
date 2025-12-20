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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, datasetId, assignedTo } = input;

      // 检查数据集是否存在
      const dataset = await ctx.db.dataset.findFirst({
        where: {
          id: datasetId,
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

      // 创建任务但不分配具体图片
      const createTaskPromises = assignedTo.map((userId) =>
        ctx.db.annotationTask.create({
          data: {
            name,
            description,
            creatorId: ctx.session.user.id,
            assignedToId: userId,
            datasetId,
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
      // 首先检查任务权限
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id: input,
          OR: [
            { creatorId: ctx.session.user.id },
            { assignedToId: ctx.session.user.id },
          ],
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在或无权限",
        });
      }

      // const images = await ctx.db.image.findMany({
      //   where: {
      //     taskOnImage: {
      //       some: {
      //         taskId: input,
      //       },
      //     },
      //     deleteById: null,
      //   },
      //   include: {
      //     annotations: true,
      //   },
      //   orderBy: [
      //     {
      //     order: "asc",
      //   },]
      // });
      const taskOnImages =await ctx.db.taskOnImage.findMany({
        where: {
          taskId: input,
          image: { 
            deleteById: null,
          },
        },
        orderBy: [
          {
            createdAt: 'asc', // 主要排序：按关联记录的创建时间
          },
          {
            image: {
               order: 'asc', // 次要排序：按图片的 order 字段
            }
          }
        ],
        include: {
          image: { // 包含我们需要的 Image 对象
            include: {
              annotations: true, // 也包含 Image 关联的 annotations
            },
          },
        },
      });

      const imagesWithAnnotationCount = taskOnImages.map((toi) => {
        const annotationCount = toi.image.annotations.length;
        return {
          ...toi.image,
          annotationCount,
          src: getImageSrc(toi.image),
        };
      });

      return imagesWithAnnotationCount;
    }),
  // 获取任务状态信息
  getTaskStatus: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: taskId }) => {
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id: taskId,
          assignedToId: ctx.session.user.id
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在或无权限",
        });
      }

      // 已分配的图片数
      const assignedCount=await ctx.db.taskOnImage.count({
        where:{
          task:{
            datasetId:task?.datasetId
          }
        }
      })
      // 计算数据集中的总图片数
      const totalInDataset = await ctx.db.image.count({
        where:{
          datasetId:task.datasetId
        }
      });
      console.log("--------------",assignedCount,totalInDataset)

      // 是否还能申请更多图片
      const canRequestMore = assignedCount < totalInDataset;

      return {
        totalInRange: totalInDataset,
        assignedCount,
        canRequestMore,
      };
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
  // 申请图片到任务
  requestImages: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: taskId }) => {
      // 检查任务是否存在且用户有权限
      const task = await ctx.db.annotationTask.findFirst({
        where: {
          id: taskId,
          assignedToId: ctx.session.user.id,
        }
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "任务不存在或无权限",
        });
      }

      // 获取未分配的图片
      const unassignedImages = await ctx.db.image.findMany({
        where:{
          datasetId:task.datasetId,
          taskOnImage:{
            none:{}
          }
        }
      });
      console.log("__________",unassignedImages)

      // 每次申请5张图片
      const imagesToAssign = unassignedImages.slice(0, 5);

      if (imagesToAssign.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "没有更多图片可以申请",
        });
      }

      // 将图片分配给任务
      await ctx.db.taskOnImage.createMany({
        data: imagesToAssign.map((image) => ({
          taskId,
          imageId: image.id,
        })),
      });

      return {
        assignedCount: imagesToAssign.length,
        totalRemaining: unassignedImages.length - imagesToAssign.length,
      };
    }),

  getRank: publicProcedure.query(async ({ ctx }) => {
    return [];
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
              where: {
                task: {
                  creatorId: "cmamm61k80008jo0a2odtvb6t",
                },
              },
            },
          },
        },
        annotations: {
          select: {
            imageId: true,
          },
          where: {
            score: null,
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
