import { useState } from "react";
import type { Key } from "react";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { api } from "@/trpc/react";

/**
 * 任务页面相关的hooks
 * @returns 任务页面所需的状态和方法
 */
export const useTasks = () => {
  const [activeKey, setActiveKey] = useState<"assigned" | "created">("assigned");
  const utils = api.useUtils();
  const { message } = App.useApp();
  const session = useSession();
  const router = useRouter();
  const { data: tasksData, isLoading } = api.task.getAll.useQuery({
    limit: 10,
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: async () => {
      message.success("任务删除成功");
      await utils.task.getAll.invalidate();
    },
  });

  const updateTaskStatus = api.task.updateStatus.useMutation({
    onSuccess: async () => {
      message.success("任务状态更新成功");
      await utils.task.getAll.invalidate();
    },
  });

  const handleDeleteTask = (id: string) => {
    deleteTask.mutate(id);
  };

  const handleUpdateTaskStatus = (id: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REVIEWING") => {
    updateTaskStatus.mutate({ id, status });
  };

  const handleMenuChange = (key: Key | undefined) => {
    if (key) {
      setActiveKey(key as "assigned" | "created");
    }
  };

  const handleStartTask = (id: string) => {
    router.push(`/label/${id}`);
  };

  return {
    activeKey,
    tasksData,
    isLoading,
    session,
    handleDeleteTask,
    handleUpdateTaskStatus,
    handleMenuChange,
    handleStartTask,
  };
}; 