import { promises as fs } from "fs";
import path from "path";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { isImageFile, getMimeTypeFromPath } from "@/utils/image";


export const imageRouter = createTRPCRouter({
  // 获取图像
  getImageById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const imageId = input;
      const image = await ctx.db.image.findUnique({
        where: {
          id: imageId,
        },
        include: {
          annotations: true,
          task: true,
        },
      });
      
      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "图像不存在",
        });
      }
      if (image.task?.assignedToId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "您没有权限访问此图像",
        });
      }
      
      
      // 检查是否配置了服务器图像目录
      if (!env.SERVER_IMAGES_DIR) {
        throw new Error("服务器图像目录未配置");
    }

  
    const fullPath = path.join(env.SERVER_IMAGES_DIR, image.path);
    try {
      // 检查是否为文件
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        throw new Error("请求的路径不是文件");
      }
  
      // 检查文件扩展名
      if (!isImageFile(fullPath)) {
        throw new Error("不支持的文件类型");
      }
  
      // 读取文件并返回
      const imageBuffer = await fs.readFile(fullPath);
      const mimeType = getMimeTypeFromPath(fullPath);
      
      // 将Buffer转换为Base64字符串
      const imageData = imageBuffer.toString('base64');
      
      return { imageData, mimeType };
    } catch (err) {
      // 安全地处理错误
      let errorMessage = "未知错误";
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        errorMessage = err.message;
      }
  
      throw new Error(`获取服务器图像失败: ${errorMessage}`);
    }
  }),
  // 获取下一张待标注图像
  // getNextImage: protectedProcedure
  //   .input(z.string())
  //   .query(async ({ ctx, input }) => {
  //     const taskId = input;

  //     // 获取任务
  //     const task = await ctx.db.annotationTask.findUnique({
  //       where: { id: taskId },
  //     });

  //     if (!task) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "任务不存在",
  //       });
  //     }

  //     // 查找最后一张已标注的图像
  //     const lastAnnotatedImage = await ctx.db.image.findFirst({
  //       where: {
  //         taskId: taskId,
  //         annotations: {
  //           some: {}, // 有至少一个关联的标注
  //         },
  //       },
  //       orderBy: {
  //         createdAt: "desc",
  //       },
  //       include: {
  //         annotations: true,
  //       },
  //     });

  //     if (lastAnnotatedImage) {
  //       // 查找最后一张已标注图像之后的下一张图像
  //       const nextImage = await ctx.db.image.findFirst({
  //         where: {
  //           taskId: taskId,
  //           createdAt: {
  //             gt: lastAnnotatedImage.createdAt,
  //           },
  //         },
  //         orderBy: {
  //           createdAt: "asc",
  //         },
  //         include: {
  //           annotations: true,
  //         },
  //       });

  //       if (nextImage) {
  //         try {
  //           const { imageData, mimeType } = await getServerImage(nextImage.path);
  //           return {
  //             ...nextImage,
  //             imageData,
  //             mimeType
  //           };
  //         } catch (error) {
  //           throw new TRPCError({
  //             code: "INTERNAL_SERVER_ERROR",
  //             message: `获取图像失败: ${error instanceof Error ? error.message : '未知错误'}`,
  //           });
  //         }
  //       }
  //     }
  //     // 查找第一张未标注的图像
  //     const firstUnannotatedImage = await ctx.db.image.findFirst({
  //       where: {
  //         taskId: taskId,
  //         annotations: {
  //           none: {}, // 没有关联的标注
  //         },
  //       },
  //       orderBy: {
  //         createdAt: "asc",
  //       },
  //       include: {
  //         annotations: true,
  //       },
  //     });

  //     if (firstUnannotatedImage) {
  //       try {
  //         const { imageData, mimeType } = await getServerImage(firstUnannotatedImage.path);
  //         return {
  //           ...firstUnannotatedImage,
  //           imageData,
  //           mimeType
  //         };
  //       } catch (error) {
  //         throw new TRPCError({
  //           code: "INTERNAL_SERVER_ERROR",
  //           message: `获取图像失败: ${error instanceof Error ? error.message : '未知错误'}`,
  //         });
  //       }
  //     }
  //     // 如果上述条件都不满足，返回第一张图像
  //     const firstImage = await ctx.db.image.findFirst({
  //       where: {
  //         taskId: taskId,
  //       },
  //       orderBy: {
  //         createdAt: "asc",
  //       },
  //       include: {
  //         annotations: true,
  //       },
  //     });

  //     if (firstImage) {
  //       try {
  //         const { imageData, mimeType } = await getServerImage(firstImage.path);
  //         return {
  //           ...firstImage,
  //           imageData,
  //           mimeType
  //         };
  //       } catch (error) {
  //         throw new TRPCError({
  //           code: "INTERNAL_SERVER_ERROR",
  //           message: `获取图像失败: ${error instanceof Error ? error.message : '未知错误'}`,
  //         });
  //       }
  //     }

  //     return null;
  //   }),
  
  // 保存图像标注
  saveAnnotations: protectedProcedure
    .input(
      z.object({
        imageId: z.string(),
        annotations: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["RECTANGLE", "POLYGON", "OCR"]),
            labelId: z.string().optional(),
            text: z.string().optional(),
            points: z.array(
              z.object({
                x: z.number(),
                y: z.number(),
                order: z.number(),
              })
            ),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { imageId, annotations } = input;
      
      // 检查图像是否存在
      const image = await ctx.db.image.findUnique({
        where: { id: imageId },
        include: { task: true },
      });
      
      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "图像不存在",
        });
      }
      
      // 检查用户是否有权限标注此图像
      if (image.task?.assignedToId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "您没有权限标注此图像",
        });
      }
      
      // 开始事务
      return await ctx.db.$transaction(async (tx) => {
        // 删除现有标注
        await tx.point.deleteMany({
          where: {
            annotation: {
              imageId,
            },
          },
        });
        
        await tx.annotation.deleteMany({
          where: {
            imageId,
          },
        });
        
        // 创建新标注
        const createdAnnotations = [];
        
        for (const annotation of annotations) {
          const { id, type, labelId, text, points } = annotation;
          
          // 创建标注
          const createdAnnotation = await tx.annotation.create({
            data: {
              id,
              type,
              labelId,
              text,
              createdById: ctx.session.user.id,
              imageId,
              taskId: image.taskId!,
              points: {
                create: points.map((point) => ({
                  x: point.x,
                  y: point.y,
                  order: point.order,
                })),
              },
            },
          });
          
          createdAnnotations.push(createdAnnotation);
        }
        
        // 更新任务状态为进行中
        if (image.taskId) {
          await tx.annotationTask.update({
            where: { id: image.taskId },
            data: { status: "IN_PROGRESS" },
          });
        }
        
        return {
          success: true,
          count: createdAnnotations.length,
        };
      });
    }),
    
  // 获取图像标注
  getAnnotations: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const imageId = input;
      
      // 检查图像是否存在
      const image = await ctx.db.image.findUnique({
        where: { id: imageId },
        include: { 
          task: true,
          annotations: {
            include: {
              label: true,
              points: {
                orderBy: {
                  order: 'asc'
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
      });
      
      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "图像不存在",
        });
      }
      
      // 检查用户是否有权限访问此图像
      if (image.task?.assignedToId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "您没有权限访问此图像",
        });
      }
      
      // 转换标注格式
      const formattedAnnotations = image.annotations.map(annotation => {
        // 获取标签信息
        const labelName = annotation.label?.name ?? '未命名';
        const labelColor = annotation.label?.color ?? '#000000';
        
        // 根据标注类型转换数据格式
        let data: Record<string, unknown> = {};
        
        if (annotation.type === 'RECTANGLE' && annotation.points.length >= 4) {
          // 矩形标注，需要计算左上角坐标和宽高
          const points = annotation.points;
          const left = Math.min(points[0]?.x ?? 0, points[3]?.x ?? 0);
          const top = Math.min(points[0]?.y ?? 0, points[1]?.y ?? 0);
          const width = Math.abs((points[1]?.x ?? 0) - (points[0]?.x ?? 0));
          const height = Math.abs((points[3]?.y ?? 0) - (points[0]?.y ?? 0));
          
          data = {
            left,
            top,
            width,
            height
          };
        } else if (annotation.type === 'POLYGON') {
          // 多边形标注，直接使用点集合
          data = {
            points: annotation.points.map(point => ({
              x: point.x,
              y: point.y
            }))
          };
        }
        
        // 返回前端需要的标注格式
        return {
          id: annotation.id,
          type: annotation.type === 'RECTANGLE' ? 'rectangle' as const : 'polygon' as const,
          label: labelName,
          labelId: annotation.labelId ?? undefined,
          color: labelColor,
          data,
          ocrText: annotation.text ?? undefined,
        };
      });
      
      return formattedAnnotations;
    }),
});
