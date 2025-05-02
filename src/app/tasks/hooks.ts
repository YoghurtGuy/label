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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: taskCount } = api.task.getCount.useQuery();
  const { data: tasksData, isLoading } = api.task.getAll.useQuery({
    pageSize: pageSize,
    page: page,
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: async () => {
      message.success("任务删除成功");
      await utils.task.getAll.invalidate();
    },
  });


  const handleDeleteTask = (id: string) => {
    deleteTask.mutate(id);
  };


  const handleMenuChange = (key: Key | undefined) => {
    if (key) {
      setActiveKey(key as "assigned" | "created");
    }
  };

  const handleStartTask = (id: string, type: "od" | "ocr") => {
    router.push(`/label/${id}/${type}`);
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
    tasksData,
    isLoading,
    session,
    taskCount,
    page,
    pageSize,
    handleDeleteTask,
    handleMenuChange,
    handleStartTask,
    handlePageChange,
  };
}; 