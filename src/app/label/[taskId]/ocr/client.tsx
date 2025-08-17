"use client";
import { InputNumber, message } from "antd";

import ImageControl from "@/app/_components/ImageControl";
import ImageScroll from "@/app/_components/ImageScroll";
import Vditor from "@/app/_components/vditor";
import { api } from "@/trpc/react";

import { useImageAnnotation } from "../hooks";

export default function OcrAnnotationClient({ taskId }: { taskId: string }) {
  const {
    currentImage,
    prevImage,
    nextImage,
    saveOcrAnnotations,
    isSaving,
    vd,
    setVd,
    score,
    setScore,
    ocrOriginalText,
    ocrPreAnnotationsId,
    setOcrPreAnnotationsId,
    imageAnnotations,
    hasPrevImage,
    hasNextImage,
    currentImageIndex,
    imageCount,
    handleImageChange,
    handleDeleteImage,
    // 新增：标注刷新
    refetchAnnotations,
  } = useImageAnnotation(taskId);

  // OCR 生成标注的mutation (支持 Gemini 和豆包)
  const ocrRefreshMutation = api.image.ocrRefresh.useMutation();

  const handleRefreshOCR = async () => {
    if (!currentImage?.id) {
      message.error("未找到当前图像");
      return;
    }
    message.loading({ content: "正在请求AI生成标注...", key: "ocr-refresh", duration: 0 });
    try {
      const result = await ocrRefreshMutation.mutateAsync({ imageId: currentImage.id });
      await refetchAnnotations();
      message.success({ 
        content: `${result.model}标注已刷新！`, 
        key: "ocr-refresh" 
      });
    } catch (error) {
      message.error({
        content: `AI标注刷新失败: ${error instanceof Error ? error.message : String(error)}`,
        key: "ocr-refresh"
      });
    }
  };

  return (
    <div className="flex">
      <div className="w-1/2">
        {score !== undefined && (
          <div className="mr-6 flex items-center justify-end gap-2">
            <span>Score:</span>
            <InputNumber
              min={0}
              disabled={true}
              value={score}
              onChange={(value) => setScore(value ?? undefined)}
            />
          </div>
        )}
        <ImageScroll src={currentImage?.src} height={683} />
      </div>
      <div className="flex w-1/2 flex-col gap-4">
        <ImageControl
          prevImage={prevImage}
          nextImage={nextImage}
          saveAnnotations={saveOcrAnnotations}
          isSaving={isSaving}
          hasPrevImage={hasPrevImage}
          hasNextImage={hasNextImage}
          imageIndex={currentImageIndex}
          imageCount={imageCount}
          handleImageChange={handleImageChange}
          deleteImage={() => handleDeleteImage(currentImage?.id)}
          ocrPreAnnotationsId={ocrPreAnnotationsId}
          setOcrPreAnnotationsId={setOcrPreAnnotationsId}
          imageAnnotations={imageAnnotations}
          onRefreshOCR={handleRefreshOCR}
        />
        <Vditor
          initialValue={ocrOriginalText}
          imageId={currentImage?.id ?? `${currentImageIndex}`}
          vd={vd}
          setVd={setVd}
        />
      </div>
    </div>
  );
}
