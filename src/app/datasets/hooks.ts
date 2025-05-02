import { useState } from "react";
import type { Key } from "react";

import { App } from "antd";
import { useSession } from "next-auth/react";

import { api } from "@/trpc/react";

/**
 * 数据集页面相关的hooks
 * @returns 数据集页面所需的状态和方法
 */
export const useDatasets = () => {
  const [activeKey, setActiveKey] = useState<"mine" | "all">("all");
  const [formVisible, setFormVisible] = useState(false);
  const [assignFormVisible, setAssignFormVisible] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<string | undefined>();
  const [assigningDatasetId, setAssigningDatasetId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const utils = api.useUtils();
  const { message } = App.useApp();
  const session = useSession();

  const { data: datasetsData, isLoading } = api.dataset.getAll.useQuery({
    pageSize: pageSize,
    page: page,
  });
  const { data: datasetCount } = api.dataset.getCount.useQuery();

  const deleteDataset = api.dataset.delete.useMutation({
    onSuccess: async () => {
      message.success("数据集删除成功");
      await utils.dataset.getAll.invalidate();
    },
  });

  const handleFormClose = () => {
    setFormVisible(false);
    setEditingDatasetId(undefined);
  };

  const handleAssignFormClose = () => {
    setAssignFormVisible(false);
    setAssigningDatasetId(undefined);
  };

  const handleEditDataset = (id: string) => {
    setEditingDatasetId(id);
    setFormVisible(true);
  };

  const handleAssignDataset = (id: string) => {
    setAssigningDatasetId(id);
    setAssignFormVisible(true);
  };

  const handleCreateDataset = () => {
    setEditingDatasetId(undefined);
    setFormVisible(true);
  };

  const handleDeleteDataset = (id: string) => {
    deleteDataset.mutate(id);
  };

  const handleMenuChange = (key: Key | undefined) => {
    if (key) {
      setActiveKey(key as "mine" | "all");
    }
  };

  const handlePageChange = (page?: number, pageSize?: number) => {
    if (page) {
      setPage(page);
    }
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  return {
    activeKey,
    formVisible,
    assignFormVisible,
    editingDatasetId,
    assigningDatasetId,
    datasetsData,
    datasetCount,
    isLoading,
    session,
    page,
    pageSize,
    handleFormClose,
    handleAssignFormClose,
    handleEditDataset,
    handleAssignDataset,
    handleCreateDataset,
    handleDeleteDataset,
    handleMenuChange,
    handlePageChange,
  };
}; 