"use client";

import { Suspense } from "react";

import { Button, Spin } from "antd";
import { useSearchParams } from "next/navigation";

import AnnotationCanvas from "@/app/_components/AnnotationCanvas";
import AnnotationList from "@/app/_components/AnnotationList";
import LabelSelector from "@/app/_components/LabelSelector";
import type { Label } from "@/types/dataset";

import { useImageAnnotation } from "./hooks";

// 创建一个内部组件来处理 useSearchParams
const LabelPageContent = () => {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId") ?? "";

  const {
    imageList,
    currentImageId,
    // setCurrentImageId,
    annotations,
    selectedAnnotation,
    taskDetails,
    currentLabelInfo,
    isLoading,
    isSaving,
    handleAnnotationChange,
    handleSelectAnnotation,
    handleSelectLabel,
    handleDeleteAnnotation,
    saveAnnotations,
    nextImage,
    prevImage,
    // getCurrentTool,
    // getCurrentColor,
  } = useImageAnnotation(taskId);

  if (!taskId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-500">错误</h1>
          <p className="text-gray-600">未提供任务ID，请检查URL参数</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (imageList.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-500">暂无图像</h1>
          <p className="text-gray-600">该任务下没有可标注的图像</p>
        </div>
      </div>
    );
  }

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
              <p className="text-gray-500">请选择一张图像进行标注</p>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <Button onClick={prevImage} disabled={!currentImageId}>
              上一张
            </Button>
            <Button type="primary" onClick={saveAnnotations} loading={isSaving}>
              保存标注
            </Button>
            <Button onClick={nextImage} disabled={!currentImageId}>
              下一张
            </Button>
          </div>
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

// 主组件，使用 Suspense 包装内部组件
const LabelPage = () => {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" tip="加载中..." />
      </div>
    }>
      <LabelPageContent />
    </Suspense>
  );
};

export default LabelPage;
