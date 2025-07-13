import { type FC } from "react";

import { Card } from "antd";
import dayjs from "dayjs";
interface DailyStats {
  date: string | undefined;
  count: number;
  isWeekend: boolean;
}

interface UserLeaderboardCardProps {
  user: {
    id: string;
    name: string | null;
    weeklyTotal: number;
    dailyStats: DailyStats[];
  };
  rank: number;
}

const getColorByCount = (stats: DailyStats): string => {
  if (stats.count >= 15) return "bg-green-800";
  if (stats.count >= 10) return "bg-green-400";
  if (stats.count >= 5) return "bg-yellow-400";
  if (stats.count >= 2) return "bg-yellow-200";
  if (stats.count >= 1) return "bg-yellow-100";
  if (stats.count === 0) {
    if (stats.isWeekend || dayjs(`${stats.date}T23:59:59+08:00`).isAfter(dayjs()))
      return "bg-gray-200";
    return "bg-red-200";
  }
  return "bg-gray-200";
};

export const UserLeaderboardCard: FC<UserLeaderboardCardProps> = ({
  user,
  rank,
}) => {
  return (
    <Card className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2 text-lg font-medium">{user.name}</span>
          <span className="text-xs text-gray-500">#{rank}</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-xs text-gray-500">合计</span>
          <span className="text-lg font-medium">{user.weeklyTotal}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {user.dailyStats.map((stat, index) => (
          <div key={index} className="flex flex-col">
            <div className={`${getColorByCount(stat)} rounded p-2 text-center`}>
              <span className="text-lg font-medium text-white">
                {stat.count}
              </span>
            </div>
            {index === 6 && (
              <span className="mt-1 text-center text-xs text-gray-500">
                {stat.date?.split("-").slice(1, 3).join("-")}
              </span>
            )}
            {index === 0 && (
              <span className="mt-1 text-center text-xs text-gray-500">
                {stat.date?.split("-").slice(1, 3).join("-")}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
