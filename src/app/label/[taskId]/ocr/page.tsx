import OcrAnnotationClient from "./client";
// import { useImageNavigation } from "./hooks";
export default async function OcrAnnotationPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  //   const { currentImageId, prevImage, nextImage, saveAnnotations, isSaving } = useImageNavigation(taskId);
  return (
    <OcrAnnotationClient taskId={taskId} />
  );
}
