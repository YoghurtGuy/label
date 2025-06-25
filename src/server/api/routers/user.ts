import dayjs from 'dayjs';
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  getLeaderboard: publicProcedure
    .input(z.string().date().optional())
    .query(async ({ ctx, input }) => {
      let mondayDate = dayjs().day(1).toDate();
      if (input) {
        mondayDate = new Date(input);
      }

      mondayDate.setHours(0, 0, 0, 0); // 设置为当天的 00:00:00.000
      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(sundayDate.getDate() + 6);
      sundayDate.setHours(23, 59, 59, 59);

      const users = await ctx.db.user.findMany({
        select: {
          id: true,
          name: true,
          annotations: {
            where: {
              createdAt: {
                gte: mondayDate,
                lte: sundayDate,
              },
            },
            select: {
              createdAt: true,
            },
          },
        },
      });

      return users
        .map((user) => {
          const dailyStats = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(mondayDate);
            date.setDate(mondayDate.getDate() + i);
            const count = user.annotations.filter(
              (annotation) =>
                annotation.createdAt.toDateString() === date.toDateString(),
            ).length;
            return {
              date: date.toISOString().split("T")[0],
              count,
              isWeekend: date.getDay() === 0 || date.getDay() === 6,
            };
          });

          return {
            id: user.id,
            name: user.name,
            weeklyTotal: user.annotations.length,
            dailyStats,
          };
        })
        .sort((a, b) => b.weeklyTotal - a.weeklyTotal);
    }),
});
