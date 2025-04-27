import { useState } from "react";

import { App } from "antd";

import { api } from "@/trpc/react";
import { type CreateTaskInput } from "@/types/task";
export interface AssignTaskFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  datasetId: string;
  title: string;
}

export const useAssignTaskForm = (props: AssignTaskFormProps) => {
  const { onCancel, onSuccess, datasetId } = props;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { message } = App.useApp();
  const utils = api.useUtils();

  // 获取所有用户
  const { data: users, isLoading: isLoadingUsers } = api.auth.getAllUsers.useQuery(undefined, {
    enabled: true,
  });

  // 获取数据集信息
  const { data: dataset, isLoading: isLoadingDataset } = api.dataset.getById.useQuery(datasetId, {
    enabled: !!datasetId,
  });

  // 创建任务
  const createTask = api.task.create.useMutation({
    onSuccess: async () => {
      message.success("任务分配成功");
      await utils.task.getAll.invalidate();
      if (onSuccess) {
        onSuccess();
      }
      onCancel();
    },
  });

  const handleFormFinish = async (values: CreateTaskInput) => {
    try {
      if (!dataset) {
        throw new Error("数据集不存在");
      }
      await createTask.mutateAsync({
        ...values,
        datasetId: dataset.id,
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
      return false;
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return {
    users,
    dataset,
    isLoading: isLoadingUsers || isLoadingDataset,
    selectedUsers,
    setSelectedUsers,
    handleFormFinish,
    handleCancel,
  };
}; 