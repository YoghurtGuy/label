"use client";
import { useEffect } from "react";

import { Button } from "antd";
export default function ImageControl({
  prevImage,
  nextImage,
  saveAnnotations,
  isSaving,
  hasPrevImage,
  hasNextImage,
}: {
  prevImage: () => void;
  nextImage: () => void;
  saveAnnotations: () => void;
  isSaving: boolean;
  hasPrevImage: boolean;
  hasNextImage: boolean;
}) {
  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "ArrowRight") {
        nextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [prevImage, nextImage]);
  return (
    <div className="mb-4 flex items-center justify-between">
      <Button onClick={prevImage} disabled={!hasPrevImage}>
        上一张
      </Button>
      <Button type="primary" onClick={saveAnnotations} loading={isSaving}>
        保存标注
      </Button>
      <Button onClick={nextImage} disabled={!hasNextImage}>
        下一张
      </Button>
    </div>
  );
}
