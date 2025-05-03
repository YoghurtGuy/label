import { api } from "@/trpc/react";
export interface ImageListProps {
  datasetId: string;
}

export const useImageList = (props: ImageListProps) => {
  const { datasetId } = props;
  const pageSize = 12; // 每页显示12张图片，即3行4列

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    api.image.getImages.useInfiniteQuery(
      {
        datasetId,
        limit: pageSize,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled:!!datasetId
      },
    );

  const images = data?.pages.flatMap((page) => page.items) ?? [];
  // const images=data?.pages?
  // data?.pages[data.pages.length-1]?.items??[]
  // :[]
  const loadMore = async () => {
    await fetchNextPage();
  };
  return {
    images,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    loadMore,
  };
};
