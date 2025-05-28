"use client";

import React from "react";

import { PlusOutlined } from "@ant-design/icons";
import { ProList } from "@ant-design/pro-components";
import { Button, Popconfirm, Tag } from "antd";
import Link from "next/link";

import { type Dataset } from "@/types/dataset";
import { renderBadge } from "@/utils/badge";

import AssignTaskForm from "../_components/AssignTaskForm";
import DatasetForm from "../_components/DatasetForm";
import { ExportOcrButton } from "../_components/ExportOcrButton";

import { useDatasets } from "./hooks";

export default function DatasetsPage() {
  const {
    activeKey,
    formVisible,
    assignFormVisible,
    editingDatasetId,
    assigningDatasetId,
    datasetsData,
    isLoading,
    session,
    datasetCount,
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
  } = useDatasets();

  return (
    <>
      <ProList<Dataset>
        rowKey="id"
        dataSource={
          activeKey === "all"
            ? datasetsData
            : datasetsData?.filter(
                (item) => item.createdById === session.data?.user.id,
              )
        }
        loading={isLoading}
        pagination={{
          pageSize,
          total: activeKey === "all" ? datasetCount?.all : datasetCount?.mine,
          current: page,
        }}
        onChange={(pagination) => handlePageChange(pagination.current, pagination.pageSize)}
        metas={{
          title: {
            dataIndex: "name",
            title: "数据集名称",
          },
          description: {
            dataIndex: "description",
            title: "描述",
          },
          subTitle: {
            render: (_, record) => (
              <div>
                <Tag
                  color={record.type === "OBJECT_DETECTION" ? "blue" : "green"}
                >
                  {record.type === "OBJECT_DETECTION" ? "目标检测" : "OCR识别"}
                </Tag>
              </div>
            ),
          },
          content: {
            render: (_, record) => (
              <div
                key="label"
                style={{ display: "flex", justifyContent: "space-around" }}
              >
                {record.type === "OBJECT_DETECTION" && (
                  <div>
                    <div className="text-center">标签</div>
                    <div className="flex flex-wrap">
                      {record.labels.slice(0, 3).map((label) => (
                        <Tag key={label.id} color={label.color}>
                          {label.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={`/datasets/${record.id}`}>
                  <div className="text-center">图像</div>
                  <div className="text-center font-bold">
                    {record.stats?.annotatedImageCount}/
                    {record.stats?.imageCount}
                  </div>
                </Link>
                {record.type === "OBJECT_DETECTION" && (
                  <div>
                    <div className="text-center">标注</div>
                    <div className="text-center font-bold">
                      {record.stats?.annotationCount}
                    </div>
                  </div>
                )}
                {record.type === "OCR" && (
                  <div>
                    <div className="text-center">预标注</div>
                    <div className="text-center font-bold">
                      {record.stats?.preAnnotatedImageCount}/
                      {record.stats?.imageCount}
                    </div>
                  </div>
                )}
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
            render: (_, record) => record.createdById===session.data?.user.id?[
              <Button key="edit" onClick={() => handleEditDataset(record.id)}>
                编辑
              </Button>,
              <Button
                key="assign"
                type="primary"
                onClick={() => handleAssignDataset(record.id)}
              >
                分配
              </Button>,
              <Popconfirm
                key="delete"
                title="确认删除"
                description="确定要删除这个数据集吗？此操作不可恢复。"
                onConfirm={() => handleDeleteDataset(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button danger>删除</Button>
              </Popconfirm>,
              record.type === "OCR" && <ExportOcrButton key="export" datasetId={record.id} />
            ]:[],
          },
        }}
        toolbar={{
          menu: {
            activeKey,
            items: [
              {
                key: "all",
                label: (
                  <span>
                    全部数据集
                    {renderBadge(
                      datasetCount?.all ?? 0,
                      activeKey === "all",
                    )}
                  </span>
                ),
              },
              {
                key: "mine",
                label: (
                  <span>
                    我创建的数据集
                    {renderBadge(
                      datasetCount?.mine ?? 0,
                      activeKey === "mine",
                    )}
                  </span>
                ),
              },
            ],
            onChange: handleMenuChange,
          },
          actions: [
            <Button key="create" type="primary" onClick={handleCreateDataset}>
              <PlusOutlined />
              创建数据集
            </Button>,
          ],
        }}
      />

      <DatasetForm
        open={formVisible}
        onCancel={handleFormClose}
        onSuccess={handleFormClose}
        initialValues={
          editingDatasetId
            ? datasetsData?.find((item) => item.id === editingDatasetId)
            : undefined
        }
        title={editingDatasetId ? "编辑数据集" : "创建数据集"}
      />

      <AssignTaskForm
        open={assignFormVisible}
        onCancel={handleAssignFormClose}
        onSuccess={handleAssignFormClose}
        datasetId={assigningDatasetId ?? ""}
        title="分配标注任务"
      />
    </>
  );
}
