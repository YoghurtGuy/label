import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/server";

export default async function Rank() {
  const ranks = await api.task.getRank();
  return (
    <Card>
      <CardHeader>
        <CardTitle>排行榜</CardTitle>
        <CardDescription>标注图片数量排行</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60">
          {ranks.map((rank) => (
            <>
              <div key={rank.id} className="flex justify-between items-center text-sm">
                <span className="w-24">{rank.name}</span>
                <div className="flex items-center gap-1 flex-1 max-w-[200px]">
                  <Progress value={rank.progress*100} className="flex-1" />
                  <span className="w-10 text-right">{rank.annotatedImageCount}</span>
                </div>
              </div>
              <Separator className="my-2" />
            </>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
