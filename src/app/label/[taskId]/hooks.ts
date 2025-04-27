import { useEffect, useState } from 'react';

import { message } from 'antd';

import { api } from '@/trpc/react';
import type { Annotation } from '@/types/annotation';
import type { Label } from '@/types/dataset';

/**
 * 图像标注相关的 hooks
 * @param taskId 任务ID
 * @returns 标注相关的状态和方法
 */
export const useImageAnnotation = (taskId: string) => {
  const [currentImageId, setCurrentImageId] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentLabelInfo, setCurrentLabelInfo] = useState<Label | null>(null);
  
  // 获取任务详情
  const { data: taskDetails, isLoading: isLoadingTask } = api.task.getById.useQuery(taskId, {
    enabled: !!taskId,
  });
  
  // 获取图像列表
  const { data: imageList = [], isLoading: isLoadingImages } = api.task.getImageListById.useQuery(taskId, {
    enabled: !!taskId,
  });

  // 获取当前图像的标注
  const { data: imageAnnotations = [], isLoading: isLoadingAnnotations, refetch: refetchAnnotations } = api.image.getAnnotations.useQuery(currentImageId, {
    enabled: !!currentImageId,
  });

  // 获取 utils 对象用于使查询失效
  const utils = api.useUtils();

  // 当获取到图像标注时，更新标注状态
  useEffect(() => {
    // 只在 imageAnnotations 真正发生变化时才更新
    const hasAnnotations = imageAnnotations.length > 0;
    const currentHasAnnotations = annotations.length > 0;
    
    if (hasAnnotations !== currentHasAnnotations || 
        JSON.stringify(imageAnnotations) !== JSON.stringify(annotations)) {
      setAnnotations(hasAnnotations ? imageAnnotations : []);
    }
  }, [imageAnnotations]);
  
  // 保存标注的mutation
  const saveAnnotationsMutation = api.image.saveAnnotations.useMutation({
    onSuccess: () => {
      message.success('标注已保存');
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('保存标注失败:', error);
      message.error('保存标注失败');
      setIsSaving(false);
    },
  });
  
  // 初始化当前图像
  useEffect(() => {
    if (imageList?.[0]) {
      setCurrentImageId(imageList[0].id);
    }
  }, [imageList]);
  
  // 处理标注变化
  const handleAnnotationChange = (newAnnotations: Annotation[]) => {
    // 保留原有标注的标签信息
    const mergedAnnotations = newAnnotations.map(newAnnot => {
      // 查找原有标注中是否存在相同ID的标注
      const existingAnnot = annotations.find(a => a.id === newAnnot.id);
      
      if (existingAnnot) {
        // 如果存在，保留原有标注的标签信息
        return {
          ...newAnnot,
          label: existingAnnot.label,
          labelId: existingAnnot.labelId,
          color: existingAnnot.color,
        };
      }
      
      // 对于新增的标注，如果有当前选中的标签信息，添加标签信息
      if (currentLabelInfo) {
        return {
          ...newAnnot,
          label: currentLabelInfo.name,
          labelId: currentLabelInfo.id,
          color: currentLabelInfo.color,
        };
      }
      
      return newAnnot;
    });
    
    setAnnotations(mergedAnnotations);
  };

  // 处理选择标签
  const handleSelectLabel = (labelId: string, labelName: string, color: string, type: 'rectangle' | 'polygon') => {
    setCurrentLabelInfo({
      id: labelId,
      name: labelName,
      color,
      type,
    });
  };
  
  // 处理选择标注
  const handleSelectAnnotation = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
  };

  // 处理删除标注
  const handleDeleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(annotation => annotation.id !== id);
    setAnnotations(newAnnotations);
    
    // 如果删除的是当前选中的标注，清除选中状态
    if (selectedAnnotation?.id === id) {
      setSelectedAnnotation(null);
    }
    void utils.image.getAnnotations.invalidate();

    // TODO: 删除图形
    message.success('标注已删除');
  };
  
  // 保存标注
  const saveAnnotations = async () => {
    if (!currentImageId) return;
    
    setIsSaving(true);
    
    try {
      // 调用API保存标注
      await saveAnnotationsMutation.mutateAsync({
        imageId: currentImageId,
        annotations: annotations.map(annotation => {
          // 转换标注格式以匹配API要求
          const points = [];
          
          if (annotation.type === 'rectangle') {
            // 矩形标注需要四个点
            const { left, top, width, height } = annotation.data;
            if (left !== undefined && top !== undefined && width !== undefined && height !== undefined) {
              points.push(
                { x: left, y: top, order: 0 },
                { x: left + width, y: top, order: 1 },
                { x: left + width, y: top + height, order: 2 },
                { x: left, y: top + height, order: 3 }
              );
            }
          } else if (annotation.type === 'polygon' && annotation.data.points) {
            // 多边形标注
            annotation.data.points.forEach((point, index) => {
              points.push({ x: point.x, y: point.y, order: index });
            });
          }
          void utils.image.getAnnotations.invalidate();
          void refetchAnnotations();
          
          return {
            id: annotation.id,
            type: annotation.type === 'rectangle' ? 'RECTANGLE' : 'POLYGON',
            labelId: annotation.labelId,
            points,
          };
        }),
      });
    } catch (error: unknown) {
      console.error('保存标注失败:', error);
      message.error('保存标注失败');
      setIsSaving(false);
    }
  };
  
  // 切换到下一张图像
  const nextImage = () => {
    if (imageList.length === 0) return;
    
    const currentIndex = imageList.findIndex(img => img.id === currentImageId);
    const nextImage = imageList[currentIndex + 1];
    if (nextImage) {
      setCurrentImageId(nextImage.id);
      setSelectedAnnotation(null);
      setAnnotations([]); // 清空当前标注
    }
  };
  
  // 切换到上一张图像
  const prevImage = () => {
    if (imageList.length === 0) return;
    
    const currentIndex = imageList.findIndex(img => img.id === currentImageId);
    const prevImage = imageList[currentIndex - 1];
    if (prevImage) {
      setCurrentImageId(prevImage.id);
      setSelectedAnnotation(null);
      setAnnotations([]); // 清空当前标注
    }
  };

  return {
    imageList,
    currentImageId,
    // setCurrentImageId,
    annotations,
    selectedAnnotation,
    taskDetails,
    currentLabelInfo,
    isLoading: isLoadingTask || isLoadingImages || isLoadingAnnotations,
    isSaving,
    handleAnnotationChange,
    handleSelectAnnotation,
    handleSelectLabel,
    handleDeleteAnnotation,
    saveAnnotations,
    nextImage,
    prevImage,
    // getCurrentTool,
    // getCurrentColor,
  };
}; 