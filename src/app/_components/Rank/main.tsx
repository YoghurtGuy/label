import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
              <div key={rank.id} className="flex justify-between text-sm">
                <span>{rank.name}</span>
                <span>{rank.annotationCount}</span>
              </div>
              <Separator className="my-2" />
            </>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
