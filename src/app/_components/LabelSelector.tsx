'use client';

import { useState } from 'react';

import { BorderOutlined, StarOutlined } from '@ant-design/icons';
import { Card, List, Button, Tooltip } from 'antd';

import type { Label } from '@/types/dataset';

interface LabelSelectorProps {
  labels: Label[];
  onLabelSelect: (labelId: string, labelName: string, color: string, type: 'rectangle' | 'polygon') => void;
}

/**
 * 标签选择组件
 * @param labels 标签列表
 * @param onLabelSelect 标签选择回调
 */
const LabelSelector: React.FC<LabelSelectorProps> = ({
  labels,
  onLabelSelect,
}) => {
  const [selectedLabel, setSelectedLabel] = useState<{
    labelId: string;
    type: 'rectangle' | 'polygon';
  } | null>(null);

  // 处理标签选择
  const handleLabelSelect = (labelId: string, labelName: string, color: string, type: 'rectangle' | 'polygon') => {
    setSelectedLabel({ labelId, type });
    onLabelSelect(labelId, labelName, color, type);
  };

  return (
    <Card 
      title="标签列表" 
      size="small" 
      className="mb-4"
    >
      <List
        size="small"
        dataSource={labels}
        renderItem={(label) => (
          <List.Item className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <div 
                className="w-4 h-4 mr-2 rounded" 
                style={{ backgroundColor: label.color }}
              />
              <span>{label.name}</span>
            </div>
            <div className="flex space-x-1">
              <Tooltip title={`绘制${label.name}矩形标注`}>
                <Button
                  type={selectedLabel?.labelId === label.id && selectedLabel?.type === 'rectangle' ? 'primary' : 'text'}
                  icon={<BorderOutlined />}
                  size="small"
                  onClick={() => handleLabelSelect(label.id, label.name, label.color, 'rectangle')}
                />
              </Tooltip>
              <Tooltip title={`绘制${label.name}多边形标注`}>
                <Button
                  type={selectedLabel?.labelId === label.id && selectedLabel?.type === 'polygon' ? 'primary' : 'text'}
                  icon={<StarOutlined />}
                  size="small"
                  onClick={() => handleLabelSelect(label.id, label.name, label.color, 'polygon')}
                />
              </Tooltip>
            </div>
          </List.Item>
        )}
      />
      {labels.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          暂无标签
        </div>
      )}
    </Card>
  );
};

export default LabelSelector; 