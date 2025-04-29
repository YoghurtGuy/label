import ObjectDetectionPage from "./client";

export default async function Page({
    params,
  }: {
    params: Promise<{ taskId: string }>
  }) {
    const { taskId } = await params
    return <ObjectDetectionPage taskId={taskId} />
  }