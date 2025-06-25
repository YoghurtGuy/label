'use client';

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
// import isoWeekYear from 'dayjs/plugin/isoWeekYear';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

dayjs.extend(isoWeek);
// dayjs.extend(isoWeekYear);

interface WeekSelectorProps {
  selectedWeek?: string;
}

const getRecentWeeks = (count = 6) => {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const monday = dayjs().startOf('isoWeek').subtract(i, 'week');
    weeks.push(monday.format('YYYY-MM-DD'));
  }
  return weeks;
};

export default function WeekSelector({ selectedWeek }: WeekSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weeks = getRecentWeeks();

  return (
    <div className="mb-4 flex justify-center">
      <Select
        value={selectedWeek ?? weeks[0]}
        onValueChange={week => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('week', week);
          router.replace(`?${params.toString()}`);
        }}
      >
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {weeks.map(week => (
            <SelectItem key={week} value={week}>
              {`${week}\t(第${dayjs(week).isoWeek()}周)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}