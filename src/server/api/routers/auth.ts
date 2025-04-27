import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { hashPassword } from "@/utils/password";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3, "用户名至少需要3个字符"),
        password: z.string().min(6, "密码至少需要6个字符"),
        name: z.string().min(1, "姓名不能为空"),
        inviteCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 检查邀请码
      if (env.INVITE_CODE) {
        if (input.inviteCode !== env.INVITE_CODE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "邀请码不正确",
          });
        }
      }
      
      // 检查用户名是否已存在
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "用户名已存在",
        });
      }

      // 创建新用户
      const hashedPassword = hashPassword(input.password);
      
      const user = await ctx.db.user.create({
        data: {
          username: input.username,
          password: hashedPassword,
          name: input.name,
        },
      });

      return {
        id: user.id,
        username: user.username,
        name: user.name,
      };
    }),
    
  // 获取所有用户
  getAllUsers: protectedProcedure
    .query(async ({ ctx }) => {
      const users = await ctx.db.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          adminPermission: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      
      return users;
    }),
}); 