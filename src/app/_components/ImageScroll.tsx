"use client";
import React, { useEffect } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Spin } from 'antd';
import Image from "next/image";

export default function ImageScrollPage({
  src,
  height,
}: {
  src?: string;
  height: number;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(true);

  const rowVirtualizer = useVirtualizer({
    count: 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => height,
    overscan: 5,
  });
  useEffect(()=>{
    setLoading(true)
  },[src])

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-64px)] w-full overflow-auto relative"
    >
      {/* 加载动画 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-80">
           <Spin size="large"/>
           <div>图像加载中...</div>
        </div>
      )}

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
          {src && (
            <Image
              src={src}
              alt="待标注图像"
              // fill
              height={10000}
              width={10000}
              unoptimized
              onLoad={() => setLoading(false)}
              priority={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
