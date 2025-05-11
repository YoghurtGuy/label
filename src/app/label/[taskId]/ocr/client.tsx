"use client";
import ImageControl from "@/app/_components/ImageControl";
import ImageScroll from "@/app/_components/ImageScroll";
import Vditor from "@/app/_components/vditor";

import { useImageAnnotation } from "../hooks";
export default function OcrAnnotationClient({ taskId }: { taskId: string }) {
  const {
    currentImageId,
    prevImage,
    nextImage,
    saveOcrAnnotations,
    isSaving,
    vd,
    setVd,
    ocrOriginalText,
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
        <ImageScroll src={currentImageId?`/img/${currentImageId}`:undefined} height={683} />
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
          deleteImage={()=>handleDeleteImage(currentImageId)}
        />
        <Vditor
          initialValue={ocrOriginalText}
          imageId={currentImageId??`${currentImageIndex}`}
          vd={vd}
          setVd={setVd}
        />
      </div>
    </div>
  );
}
