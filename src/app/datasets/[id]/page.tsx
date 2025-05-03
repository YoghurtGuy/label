import React from 'react';

import { notFound } from 'next/navigation';

import ImageList from '@/app/_components/ImageList';
import {api} from '@/trpc/server'


export default async function ImageListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const data = await api.dataset.getById(id)
  if (!id) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{`${data.name}-图像`}</h1>
      <ImageList datasetId={id} />
    </div>
  );
};
