'use client';

import { useEffect, useRef, useState } from 'react';

import { Canvas, FabricImage, Rect, Polygon, type FabricObject ,type TPointerEvent, type TPointerEventInfo} from 'fabric';

import type { Annotation } from '@/types/annotation';
import type { Label } from '@/types/dataset';
import logger from '@/utils/logger';
interface AnnotationCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  label: Label;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  annotations?: Annotation[];
  selectedAnnotationId?: string | null;
}

/**
 * 标注画布组件
 * @param imageUrl 图像URL
 * @param width 画布宽度
 * @param height 画布高度
 * @param label 当前选中的标签
 * @param onAnnotationChange 标注变化回调
 * @param annotations 外部传入的标注数据
 * @param selectedAnnotationId 当前选中的标注ID
 */
const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  width,
  height,
  label,
  onAnnotationChange,
  annotations = [],
  selectedAnnotationId = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  // const [currentTool, setCurrentTool] = useState<'rectangle' | 'polygon' | 'select'>(label.type);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const objectMapRef = useRef<Map<string, FabricObject>>(new Map());

  const defaultOpacity = 0.5;
  const defaultStrokeWidth = 2;

  const canvasLogger = logger.child({ name: "CANVAS", imageUrl, width, height, label, selectedAnnotationId });
  // 当外部tool属性变化时更新
  useEffect(() => {
    finishPolygon();
    if (fabricCanvasRef.current) {
      if (label.type === 'select') {
        fabricCanvasRef.current.isDrawingMode = false;
        fabricCanvasRef.current.selection = true;
      } else {
        fabricCanvasRef.current.selection = false;
      }
    }
  }, [label.id, label.type]);

  // 初始化画布
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 Fabric.js 画布
    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f0f0f0',
    });

    fabricCanvasRef.current = canvas;

    // 加载图像
    void (async () => {
      try {
        const img = await FabricImage.fromURL(imageUrl);
        // 调整图像大小以适应画布
        const scale = Math.min(width / img.width, height / img.height);
        void img.scale(scale);
        
        // 居中图像
        void img.set({
          left: (width - img.width * scale) / 2,
          top: (height - img.height * scale) / 2,
          selectable: false,
        });
        
        void canvas.add(img);
        void canvas.renderAll();
        canvasLogger.info('图像已加载');
      } catch (error) {
        canvasLogger.error('加载图像失败:', error);
      }
    })();

    // 清理函数
    return () => {
      const currentObjectMap = objectMapRef;
      void canvas.dispose();
      currentObjectMap.current.clear();
      canvasLogger.info('画布已清理');
    };
  }, [imageUrl, width, height]);

  // 当外部标注数据变化时，更新画布
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // 清除所有标注对象
    const objectsToRemove = canvas.getObjects().filter(
      (obj) => obj.type === 'rect' || obj.type === 'polygon'
    );
    objectsToRemove.forEach((obj) => canvas.remove(obj));
    objectMapRef.current.clear();
    
    // 添加新的标注对象
    annotations.forEach((annotation) => {
      let obj: FabricObject | null = null;
      
      if (annotation.type === 'rectangle') {
        const { left, top, width, height, fill, opacity } = annotation.data;
        obj = new Rect({
          left,
          top,
          width,
          height,
          fill: fill ?? annotation.color,
          opacity: opacity ?? defaultOpacity,
          stroke: '#000000',
          strokeWidth: defaultStrokeWidth,
        });
      } else if (annotation.type === 'polygon' && annotation.data.points) {
        obj = new Polygon(
          annotation.data.points,
          {
            fill: annotation.data.fill ?? annotation.color,
            opacity: annotation.data.opacity ?? defaultOpacity,
            stroke: '#000000',
            strokeWidth: defaultStrokeWidth,
          }
        );
      }
      
      if (obj) {
        canvas.add(obj);
        canvas.bringObjectToFront(obj);
        // 将标注ID与Fabric对象关联起来
        objectMapRef.current.set(annotation.id, obj);
      }
    });
    
    canvas.renderAll();
  }, [annotations,]);

  // 处理外部选中标注的变化
  useEffect(() => {
    if (!fabricCanvasRef.current || !selectedAnnotationId) return;
    
    const canvas = fabricCanvasRef.current;
    const selectedObject = objectMapRef.current.get(selectedAnnotationId);
    
    if (selectedObject) {
      canvas.setActiveObject(selectedObject);
      canvas.renderAll();
    }
  }, [selectedAnnotationId]);

  // 处理鼠标按下事件
  const handleMouseDown = (e: TPointerEventInfo<TPointerEvent>) => {
    if (!fabricCanvasRef.current) return;
    
    if (label.type === 'rectangle') {
      const pointer = fabricCanvasRef.current.getScenePoint(e.e);
      const rect = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: label.color,
        opacity: defaultOpacity,
        stroke: '#000000',
        strokeWidth: defaultStrokeWidth,
      });
      
      fabricCanvasRef.current.add(rect);
      fabricCanvasRef.current.setActiveObject(rect);
      setIsDrawing(true);
    } else if (label.type === 'polygon') {
      const pointer = fabricCanvasRef.current.getScenePoint(e.e);
      
      if (polygonPoints.length === 0) {
        // 开始绘制多边形
        setPolygonPoints([{ x: pointer.x, y: pointer.y }]);
        setIsDrawing(true);
      } else {
        // 添加多边形点
        const newPoints = [...polygonPoints, { x: pointer.x, y: pointer.y }];
        setPolygonPoints(newPoints);
        
        // 如果点数大于等于3，自动完成当前多边形
        if (newPoints.length >= 3) {
          // TODO: 展示多边形
        }
      }
    }
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: TPointerEventInfo<TPointerEvent>) => {
    if (!fabricCanvasRef.current || !isDrawing) return;
    
    if (label.type === 'rectangle') {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject && activeObject.type === 'rect') {
        const pointer = fabricCanvasRef.current.getScenePoint(e.e);
        const rect = activeObject as Rect;
        
        const width = Math.abs(pointer.x - rect.left);
        const height = Math.abs(pointer.y - rect.top);
        
        rect.set({
          width,
          height,
        });
        
        fabricCanvasRef.current.renderAll();
      }
    }
  };

  // 处理鼠标松开事件
  const handleMouseUp = () => {
    if (!fabricCanvasRef.current) return;
    
    if (label.type === 'rectangle') {
      setIsDrawing(false);
      notifyAnnotationChange();
    }
  };

  // 完成多边形绘制
  const finishPolygon = () => {
    if (!fabricCanvasRef.current || polygonPoints.length < 3) return;
    
    // 创建多边形
    const polygon = new Polygon(
      polygonPoints.map(point => ({ x: point.x, y: point.y })),
      {
        fill: label.color,
        opacity: defaultOpacity,
        stroke: '#000000',
        strokeWidth: defaultStrokeWidth,
      }
    );
    
    fabricCanvasRef.current.add(polygon);
    fabricCanvasRef.current.renderAll();
    canvasLogger.info('多边形已绘制', {
      polygonPoints,
      label,
    });

    // 重置多边形点
    setPolygonPoints([]);
    setIsDrawing(false);
    notifyAnnotationChange();
  };

  // 通知标注变化
  const notifyAnnotationChange = () => {
    if (!fabricCanvasRef.current || !onAnnotationChange) return;
    
    const result: Annotation[] = [];
    
    fabricCanvasRef.current.getObjects()
      .filter((obj: FabricObject) => obj.type === 'rect' || obj.type === 'polygon')
      .forEach((obj: FabricObject) => {
        // 查找现有标注
        const existingAnnotation = annotations.find(annotation => {
          const existingObj = objectMapRef.current.get(annotation.id);
          return existingObj === obj;
        });

        if (obj.type === 'rect') {
          const rect = obj as Rect;
          result.push({
            id: existingAnnotation?.id ?? String(Date.now() + Math.random()),
            type: 'rectangle',
            label: existingAnnotation?.label ?? '',
            color: existingAnnotation?.color ?? label.color,
            data: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              fill: typeof rect.fill === 'string' ? rect.fill : undefined,
              opacity: rect.opacity,
            }
          });
        } else if (obj.type === 'polygon') {
          const polygon = obj as Polygon;
          result.push({
            id: existingAnnotation?.id ?? String(Date.now() + Math.random()),
            type: 'polygon',
            label: existingAnnotation?.label ?? '',
            color: existingAnnotation?.color ?? label.color,
            data: {
              points: polygon.points,
              fill: typeof polygon.fill === 'string' ? polygon.fill : undefined,
              opacity: polygon.opacity,
            }
          });
        }
      });
    
    onAnnotationChange(result);
  };

  // 设置事件监听
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    // 对象修改事件，当用户拖动或调整标注时触发
    const handleObjectModified = () => {
      notifyAnnotationChange();
    };
    
    canvas.on('object:modified', handleObjectModified);
    
    // 添加全局点击事件监听器
    const handleGlobalClick = (e: MouseEvent) => {
      // 检查点击是否在画布外部
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;
      
      const rect = canvasElement.getBoundingClientRect();
      const isOutsideCanvas = 
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      
      // 如果在画布外部且正在绘制多边形，则完成多边形绘制
      if (isOutsideCanvas && label.type === 'polygon' && polygonPoints.length >= 3) {
        finishPolygon();
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('object:modified', handleObjectModified);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [label.type, isDrawing, polygonPoints]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative border border-gray-300">
        <canvas ref={canvasRef} />
        
        {label.type === 'polygon' && polygonPoints.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <svg width={width} height={height}>
              {polygonPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill="red"
                  stroke="black"
                  strokeWidth={1}
                />
              ))}
              {polygonPoints.length > 1 && (
                <polyline
                  points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="red"
                  strokeWidth={2}
                />
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotationCanvas; 