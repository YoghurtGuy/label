import { createTRPCRouter, publicProcedure } from '../trpc';


export const userRouter = createTRPCRouter({
  getLeaderboard: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6); // 前7天(包含今天)

    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        annotations: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          select: {
            createdAt: true,
          },
        },
      },
    });

    return users.map(user => {
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const count = user.annotations.filter(
          annotation => annotation.createdAt.toDateString() === date.toDateString()
        ).length;
        return {
          date: date.toISOString().split('T')[0],
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
    }).sort((a, b) => b.weeklyTotal - a.weeklyTotal);
  }),
}); 