"use client";

import React from "react";

import { ProList } from "@ant-design/pro-components";
import { Button, Popconfirm, Tag} from "antd";

import { renderBadge } from "@/utils/badge";

import { useTasks } from "./hooks";

export default function TasksPage() {
  const {
    activeKey,
    tasksData,
    isLoading,
    session,
    handleDeleteTask,
    // handleUpdateTaskStatus,
    handleMenuChange,
    handleStartTask,
  } = useTasks();

  // 根据activeKey过滤任务
  const filteredTasks = tasksData?.items.filter((task) => {
    if (activeKey === "assigned") {
      return task.assignedToId === session.data?.user.id;
    } else {
      return task.creatorId === session.data?.user.id;
    }
  });

  // 获取任务状态对应的颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "default";
      case "IN_PROGRESS":
        return "processing";
      case "COMPLETED":
        return "success";
      case "REVIEWING":
        return "warning";
      default:
        return "default";
    }
  };

  // 获取任务状态对应的文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "待处理";
      case "IN_PROGRESS":
        return "进行中";
      case "COMPLETED":
        return "已完成";
      case "REVIEWING":
        return "审核中";
      default:
        return "未知";
    }
  };

  return (
    <>
      <ProList
        rowKey="id"
        dataSource={filteredTasks}
        loading={isLoading}
        pagination={{
          pageSize: 10,
        }}
        metas={{
          title: {
            dataIndex: "name",
            title: "任务名称",
          },
          description: {
            dataIndex: "description",
            title: "描述",
          },
          subTitle: {
            render: (_, record) => (
              <div>
                <Tag color={record.dataset.type === "OBJECT_DETECTION" ? "blue" : "green"}>
                  {record.dataset.type === "OBJECT_DETECTION" ? "目标检测" : "OCR识别"}
                </Tag>
                <Tag color={getStatusColor(record.status)}>
                  {getStatusText(record.status)}
                </Tag>
                {activeKey === "created" && (
                  <Tag color="green">
                    {record.assignedTo?.name}
                  </Tag>
                )}
              </div>
            ),
          },
          content: {
            render: (_, record) => (
              <div
                key="content"
                style={{ display: "flex", justifyContent: "space-around" }}
              >
                <div>
                  <div className="text-center">数据集</div>
                  <div className="text-center font-bold">
                    {record.dataset.name}
                  </div>
                </div>
                <div>
                  <div className="text-center">图像</div>
                  <div className="text-center font-bold">
                    {record.stats?.annotatedImageCount}/{record.stats?.imageCount}
                  </div>
                </div>
                <div>
                  <div className="text-center">标注</div>
                  <div className="text-center font-bold">
                    {record.stats?.annotationCount}
                  </div>
                </div>
                <div>
                  <div className="text-center">创建时间</div>
                  <div className="text-center">
                    {record.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ),
          },
          actions: {
            render: (_, record) => 
            activeKey === "created" ?[
            //   <Select
            //     key="status"
            //     defaultValue={record.status}
            //     style={{ width: 120 }}
            //     onChange={(value) => handleUpdateTaskStatus(record.id, value)}
            //     options={[
            //       { value: "PENDING", label: "待处理" },
            //       { value: "IN_PROGRESS", label: "进行中" },
            //       { value: "COMPLETED", label: "已完成" },
            //       { value: "REVIEWING", label: "审核中" },
            //     ]}
            //   />,
            <Popconfirm
                key="delete"
                title="确认删除"
                description="确定要删除这个任务吗？此操作不可恢复。"
                onConfirm={() => handleDeleteTask(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button danger>删除</Button>
              </Popconfirm> 
          ]:[
            <Button
            key="start"
            type="primary"
            onClick={() => handleStartTask(record.id)}
          >
            开始
          </Button>,
          ],
          },
        }}
        toolbar={{
          menu: {
            activeKey,
            items: [
              {
                key: 'assigned',
                label: (
                  <span>分配给我的任务{renderBadge(tasksData?.items.filter((item) => item.assignedToId === session.data?.user.id).length ?? 0, activeKey === 'assigned')}</span>
                ),
              },
              {
                key: 'created',
                label: (
                  <span>
                    我创建的任务{renderBadge(tasksData?.items.filter((item) => item.creatorId === session.data?.user.id).length ?? 0, activeKey === 'created')}
                  </span>
                ),
              },
            ],
            onChange: handleMenuChange,
          },
        }}
      />
    </>
  );
} 