import { type Metadata } from "next";

import { api } from '@/trpc/server';

import LeaderboardList from './_components/LeaderboardList';
import WeekSelector from './_components/WeekSelector';


export const metadata: Metadata = {
  title: "标注排行榜",
  description: "按周排名",
  icons: [{ rel: "icon", url: "/logo.png" }],
};
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const leaderboardData = await api.user.getLeaderboard(week);

  // 提供 fetchLeaderboard 方法给客户端
  const fetchLeaderboard = async (w?: string) => {
    'use server';
    return await api.user.getLeaderboard(w);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">标注排行榜</h1>
      <WeekSelector selectedWeek={week} />
      <LeaderboardList
        week={week}
        initialData={leaderboardData}
        fetchLeaderboard={fetchLeaderboard}
      />
    </div>
  );
} 