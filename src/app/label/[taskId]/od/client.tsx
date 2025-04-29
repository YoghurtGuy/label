"use client";

import AnnotationCanvas from "@/app/_components/AnnotationCanvas";
import AnnotationList from "@/app/_components/AnnotationList";
import ImageControl from "@/app/_components/ImageControl";
import LabelSelector from "@/app/_components/LabelSelector";
import type { Label } from "@/types/dataset";

import { useImageAnnotation } from "../hooks";
export default function ObjectDetectionPage({
  taskId,
}: {
  taskId: string
}) {

  const {
    imageList,
    currentImageId,
    // setCurrentImageId,
    annotations,
    selectedAnnotation,
    taskDetails,
    currentLabelInfo,
    isSaving,
    handleAnnotationChange,
    handleSelectAnnotation,
    handleSelectLabel,
    handleDeleteAnnotation,
    saveAnnotations,
    nextImage,
    prevImage,
    hasPrevImage,
    hasNextImage,
    // getCurrentTool,
    // getCurrentColor,
  } = useImageAnnotation(taskId);

  if (!taskId||taskDetails?.dataset?.type !== "OBJECT_DETECTION") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-500">错误</h1>
          <p className="text-gray-600">未提供任务ID，请检查URL参数</p>
        </div>
      </div>
    );
  }

  // if (isLoading) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Spin size="large" tip="加载中..." />
  //     </div>
  //   );
  // }

  // if (imageList.length === 0) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="mb-4 text-2xl font-bold text-gray-500">暂无图像</h1>
  //         <p className="text-gray-600">该任务下没有可标注的图像</p>
  //       </div>
  //     </div>
  //   );
  // }

  const currentImage = imageList.find((img) => img.id === currentImageId);
  const imageUrl = currentImage ? `/img/${currentImage.id}` : "";

  // 获取数据集的标签列表
  const datasetLabels = taskDetails?.dataset?.labels as Label[] | undefined;

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-3">
          {currentImage ? (
            <div className="relative overflow-hidden rounded-lg border">
              <AnnotationCanvas
                imageUrl={imageUrl}
                width={800}
                height={600}
                label={currentLabelInfo ?? { id: "", name: "", color: "", type: "select" }}
                onAnnotationChange={handleAnnotationChange}
                annotations={annotations}
                selectedAnnotationId={selectedAnnotation?.id}
              />
            </div>
          ) : (
            <div className="rounded-lg bg-gray-100 p-8 text-center">
              <p className="text-gray-500">加载中...</p>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <ImageControl
            prevImage={prevImage}
            nextImage={nextImage}
            hasPrevImage={hasPrevImage}
            hasNextImage={hasNextImage}
            saveAnnotations={saveAnnotations}
            isSaving={isSaving}
          />
          <div className="mb-4">
            <LabelSelector
              labels={datasetLabels ?? []}
              onLabelSelect={handleSelectLabel}
            />
          </div>

          <div className="mb-4">
            <AnnotationList
              annotations={annotations}
              onSelectAnnotation={handleSelectAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              selectedAnnotation={selectedAnnotation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

