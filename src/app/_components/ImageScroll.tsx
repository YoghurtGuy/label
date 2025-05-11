"use client";
import React from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import Image from "next/image";

export default function ImageScrollPage({
  src,
  height,
}: {
  src?: string;
  height: number;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => height,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-64px)] w-full overflow-auto"
      style={{
        width: "100%",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${height}px`,
            transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
          }}
        >
          {src&&
          <Image
            src={src}
            alt="待标注图像"
            fill
            unoptimized
          />}
        </div>
      </div>
    </div>
  );
}
