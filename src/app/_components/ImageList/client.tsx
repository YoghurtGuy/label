"use client";
import React from "react";

// import { useInfiniteQuery } from '@tanstack/react-query';
import { Card, Row, Col, Button, Image, Spin } from "antd";

import { type ImageListProps, useImageList } from "./hooks";

const ImageList: React.FC<ImageListProps> = ({ datasetId }) => {
  const { images, hasNextPage, isFetchingNextPage, isLoading, loadMore } =
    useImageList({ datasetId });
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Row gutter={[16, 16]}>
        {images.map((image) => (
          <Col key={image.id} xs={12} sm={8} md={6} lg={6} xl={6}>
            <Card
              hoverable
              cover={
                <Image
                  alt={image.filename}
                  src={`/img/${image.id}`}
                  className="object-cover"
                  height={200}
                />
              }
            >
              <Card.Meta title={`${image.order}`} description={image.filename} />
            </Card>
          </Col>
        ))}
      </Row>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            type="primary"
            onClick={loadMore}
            loading={isFetchingNextPage}
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageList;
