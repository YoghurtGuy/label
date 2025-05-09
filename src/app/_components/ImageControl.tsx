"use client";
// import { useEffect } from "react";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, InputNumber, Popconfirm } from "antd";
export default function ImageControl({
  prevImage,
  nextImage,
  saveAnnotations,
  handleImageChange,
  deleteImage,
  isSaving,
  hasPrevImage,
  hasNextImage,
  imageIndex,
  imageCount,
}: {
  prevImage: () => void;
  nextImage: () => void;
  saveAnnotations: () => void;
  deleteImage: () => void;
  handleImageChange: (imageIndex: number) => void;
  isSaving: boolean;
  hasPrevImage: boolean;
  hasNextImage: boolean;
  imageIndex: number;
  imageCount: number;
}) {
  // 键盘快捷键处理
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "ArrowLeft") {
  //       prevImage();
  //     } else if (e.key === "ArrowRight") {
  //       nextImage();
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [prevImage, nextImage]);
  return (
    <div className="mb-4 flex items-center justify-between">
      <Button onClick={prevImage} disabled={!hasPrevImage}>
        <LeftOutlined />
      </Button>
      <InputNumber
        value={imageIndex + 1}
        suffix={`/${imageCount ?? 0}`}
        min={1}
        max={imageCount ?? 0}
        onChange={(value) => handleImageChange((value ?? 0) - 1)}
      />
      <Button type="primary" onClick={saveAnnotations} loading={isSaving}>
        保存标注
      </Button>
      <Popconfirm
        key="delete"
        title="确定要删除这个标注吗？"
        onConfirm={deleteImage}
        okText="确定"
        cancelText="取消"
      >
        <Button danger type="dashed">
          删除图像
        </Button>
      </Popconfirm>
      <Button onClick={nextImage} disabled={!hasNextImage}>
        <RightOutlined />
      </Button>
    </div>
  );
}
