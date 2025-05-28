import { AnnotationType, DatasetType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const exportRouter = createTRPCRouter({
  exportOcrAnnotations: protectedProcedure
    .input(z.object({
      datasetId: z.string(),
      question: z.string().optional().default('识别出图中的手写文字，用markdown格式返回,不要返回其他内容'),
    }))
    .query(async ({ ctx, input }) => {
      const dataset = await ctx.db.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
      });
      if (!dataset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset not found",
        });
      }
      if (dataset.type !== DatasetType.OCR) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dataset is not an OCR dataset",
        });
      }
      if(dataset.createdById !== ctx.session.user.id){
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to export this dataset",
        });
      }
      const annotations = await ctx.db.annotation.findMany({
        where: {
          image: {
            datasetId: input.datasetId,
          },
          createdById: {
            not: null,
          },
          type: AnnotationType.OCR,
        },
        include: {
          image: true,
        },
      });

      return annotations.map(annotation => ({
        conversations: [
          {
            from: "human",
            value: `<image>${input.question}`
          },
          {
            from: "gpt",
            value: annotation.text ?? ""
          }
        ],
        images: [annotation.image.path ?? ""]
      }));
    }),
}); 