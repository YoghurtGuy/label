import { Card } from 'antd';

import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardCardSkeleton() {
  return (
    <Card className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Skeleton className="h-6 w-10 mr-2" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div className="flex items-center">
          <Skeleton className="h-4 w-8 mr-2" />
          <Skeleton className="h-6 w-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded" />
            {(i==0||i==6)&&<Skeleton className="h-4 w-8 mt-1" />}
          </div>
        ))}
      </div>
    </Card>
  );
}
