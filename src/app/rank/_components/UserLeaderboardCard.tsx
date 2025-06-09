import { type FC } from 'react';

import { Card} from 'antd';

interface DailyStats {
  date: string|undefined;
  count: number;
  isWeekend: boolean;
}

interface UserLeaderboardCardProps {
  user: {
    id: string;
    name: string|null;
    weeklyTotal: number;
    dailyStats: DailyStats[];
  };
  rank: number;
}

const getColorByCount = (count: number,isWeekend: boolean): string => {
  if (count >= 15) return 'bg-green-800';
  if (count >= 10) return 'bg-green-400';
  if (count >= 5) return 'bg-yellow-400';
  if (count >= 2) return 'bg-yellow-200';
  if (count >= 1) return 'bg-yellow-100';
  if (count === 0) {
    if (isWeekend) return 'bg-gray-200';
    return 'bg-red-200';
  }
  return 'bg-gray-200';
};

export const UserLeaderboardCard: FC<UserLeaderboardCardProps> = ({ user, rank }) => {
  return (
    <Card className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <span className="text-lg font-medium mr-2">{user.name}</span>
          <span className="text-gray-500 text-xs">#{rank}</span>
        </div>
        <div className="flex items-center">
          <span className="text-gray-500 text-xs mr-2">近7天</span>
          <span className="text-lg font-medium">{user.weeklyTotal}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {user.dailyStats.map((stat, index) => (
          <div key={index} className="flex flex-col">
            <div
              className={`${getColorByCount(stat.count,stat.isWeekend)} rounded p-2 text-center`}
            >
              <span className="text-white font-medium text-lg">{stat.count}</span>
            </div>
            {index === 6 && (
              <span className="text-xs text-gray-500 mt-1 text-center">今天</span>
            )}
            {index === 0 && (
              <span className="text-xs text-gray-500 mt-1 text-center">{stat.date?.split('-').slice(1,3).join('-')}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}; 