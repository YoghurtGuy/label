import LabelPage from "./client";

export default async function Page({
    params,
  }: {
    params: Promise<{ taskId: string }>
  }) {
    const { taskId } = await params
    return <LabelPage taskId={taskId} />
  }