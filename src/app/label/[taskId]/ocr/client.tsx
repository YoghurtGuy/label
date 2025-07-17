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

  // Gemini OCR 生成标注的mutation
  const geminiOcrMutation = api.image.ocrGemini.useMutation();

  const handleRefreshGemini = async () => {
    if (!currentImage?.id) {
      message.error("未找到当前图像");
      return;
    }
    message.loading({ content: "正在请求Gemini生成标注...", key: "gemini-ocr", duration: 0 });
    try {
      await geminiOcrMutation.mutateAsync({ imageId: currentImage.id });
      await refetchAnnotations();
      message.destroy("gemini-ocr");
      message.success({ content: "Gemini标注已刷新！", key: "gemini-ocr" });
    } catch (error) {
      message.error({
        content: `Gemini标注刷新失败: ${error instanceof Error ? error.message : String(error)}`,
        key: "gemini-ocr"
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
          onRefreshGemini={handleRefreshGemini}
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
