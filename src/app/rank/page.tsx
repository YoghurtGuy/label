import { api } from '@/trpc/server';

import { UserLeaderboardCard } from './_components/UserLeaderboardCard';

export default async function LeaderboardPage() {
  const leaderboardData = await api.user.getLeaderboard();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">标注排行榜</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {leaderboardData?.map((user, index) => (
          <UserLeaderboardCard
            key={user.id}
            user={user}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
} 