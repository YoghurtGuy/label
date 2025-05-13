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
    taskCount,
    page,
    pageSize,
    handleDeleteTask,
    handleMenuChange,
    handleStartTask,
    handlePageChange,
  } = useTasks();

  return (
    <>
      <ProList
        rowKey="id"
        dataSource={tasksData}
        loading={isLoading}
        pagination={{
          pageSize: pageSize,
          current: page,
          total: activeKey === "assigned" ? taskCount?.assigned : taskCount?.created,
          onChange: (p) => handlePageChange(p)
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
            onClick={() => handleStartTask(record.id, record.dataset.type === "OBJECT_DETECTION" ? "od" : "ocr")}
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
                  <span>分配给我的任务{renderBadge(taskCount?.assigned ?? 0, activeKey === 'assigned')}</span>
                ),
              },
              {
                key: 'created',
                label: (
                  <span>
                    我创建的任务{renderBadge(taskCount?.created ?? 0, activeKey === 'created')}
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