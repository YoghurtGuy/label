"use client";
import { InputNumber } from "antd";

import ImageControl from "@/app/_components/ImageControl";
import ImageScroll from "@/app/_components/ImageScroll";
import Vditor from "@/app/_components/vditor";

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
  } = useImageAnnotation(taskId);
  return (
    <div className="flex">
      <div className="w-1/2">
        {score !== undefined && (
          <div className="flex items-center gap-2 justify-end mr-6">
            <span>Score:</span>
          <InputNumber
            min={0}
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
