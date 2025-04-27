"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { List, Button, Popconfirm, Card } from "antd";

import type { Annotation } from "@/types/annotation";

interface AnnotationListProps {
  annotations: Annotation[];
  onSelectAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  selectedAnnotation: Annotation | null;
}

/**
 * 标注列表组件
 * @param annotations 标注列表
 * @param onAnnotationChange 标注变化回调
 * @param onSelectAnnotation 选择标注回调
 * @param onDeleteAnnotation 删除标注回调
 * @param selectedAnnotation 当前选中的标注
 */
const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  onSelectAnnotation,
  onDeleteAnnotation,
  selectedAnnotation,
}) => {
  // 处理删除标注
  const handleDelete = (id: string) => {
    onDeleteAnnotation(id);
  };

  // 处理选择标注
  const handleSelect = (annotation: Annotation) => {
    onSelectAnnotation(annotation);
  };

  // 渲染标注项
  const renderAnnotationItem = (annotation: Annotation) => {
    const isSelected = selectedAnnotation?.id === annotation.id;

    return (
      <List.Item
        key={annotation.id}
        actions={[
          <Popconfirm
            key="delete"
            title="确定要删除这个标注吗？"
            onConfirm={() => handleDelete(annotation.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ]}
        onClick={() => handleSelect(annotation)}
        className={`cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
      >
        <div className="flex items-center">
          <div
            className="mr-2 h-4 w-4 rounded"
            style={{ backgroundColor: annotation.color }}
          />
          <span>{annotation.label ?? "未命名"}</span>
        </div>
      </List.Item>
    );
  };

  return (
    <Card title="标注列表" size="small" className="mb-4">
      {annotations.length === 0 ? (
        <div className="py-4 text-center text-gray-500">暂无标注</div>
      ) : (
        <List
          dataSource={annotations}
          renderItem={renderAnnotationItem}
          size="small"
        />
      )}
    </Card>
  );
};

export default AnnotationList;
