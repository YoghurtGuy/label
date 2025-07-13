'use client';

import { useEffect, useState } from 'react';

import LeaderboardCardSkeleton from './LeaderboardCardSkeleton';
import { UserLeaderboardCard } from './UserLeaderboardCard';

interface DailyStats {
  date: string|undefined;
  count: number;
  isWeekend: boolean;
}
interface User {
  id: string;
  name: string|null;
  weeklyTotal: number;
  dailyStats: DailyStats[];
}
interface LeaderboardListProps {
  week: string|undefined;
  initialData: User[];
  fetchLeaderboard: (week?: string) => Promise<User[]>;
}

export default function LeaderboardList({ week, initialData, fetchLeaderboard }: LeaderboardListProps) {
  const [data, setData] = useState<User[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetchLeaderboard(week).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [week,fetchLeaderboard]);

  // 骨架屏数量可与上次数据一致，或固定为 6
  const skeletonCount = data.length ?? 6;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:px-50">
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <LeaderboardCardSkeleton key={i} />
          ))
        : data.map((user, index) => (
            <UserLeaderboardCard key={user.id} user={user} rank={index + 1} />
          ))}
    </div>
  );
}