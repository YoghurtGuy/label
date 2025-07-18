"use client";
// import { useEffect } from "react";

import { GoogleOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { type User } from "@prisma/client";
import { Button, InputNumber, Popconfirm, Select } from "antd";
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
  ocrPreAnnotationsId,
  setOcrPreAnnotationsId,
  imageAnnotations,
  onRefreshGemini,
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
  ocrPreAnnotationsId?: string | undefined;
  setOcrPreAnnotationsId?: (ocrPreAnnotationsId: string) => void;
  imageAnnotations?: { createdBy: User | null; createdAt: Date; id: string,note?:string }[];
  onRefreshGemini?: () => void;
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
      {/* 刷新Gemini按钮，仅OCR场景下显示 */}
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
      {imageAnnotations && setOcrPreAnnotationsId && (
        <Select
          value={ocrPreAnnotationsId}
          onChange={(value) => setOcrPreAnnotationsId(value)}
          options={imageAnnotations.map((annotation) => ({
            label: `${annotation.createdBy?.name??"预标"}:${annotation.note??annotation.createdAt.toLocaleDateString("zh-CN").slice(0, 10).replace(/-/g, '')}`,
            value: annotation.id,
            title: `${annotation.note??"-"}:${annotation.createdAt.toLocaleDateString("zh-CN")}`,
          }))}
        />
      )}
      {onRefreshGemini && (
        <GoogleOutlined onClick={onRefreshGemini}/>
      )}
      <Button onClick={nextImage} disabled={!hasNextImage}>
        <RightOutlined />
      </Button>
    </div>
  );
}
