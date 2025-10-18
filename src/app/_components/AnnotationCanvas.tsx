'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect as KonvaRect, Line as KonvaLine, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import type { Annotation } from '@/types/annotation';
import type { Label } from '@/types/dataset';
import Konva from 'konva';

interface AnnotationCanvasProps {
  imageUrl: string;
  label: Label;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  annotations?: Annotation[];
  selectedAnnotationId?: string | null;
  onSelectAnnotation: (annotation: Annotation) => void;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  label,
  onAnnotationChange,
  annotations = [],
  selectedAnnotationId = null,
  onSelectAnnotation
}) => {
  const [image] = useImage(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (label.type === 'select') return;
    if (!onAnnotationChange) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (label.type === 'rectangle') {
      setIsDrawing(true);
      setStartPoint(pos);
      setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (label.type === 'polygon') {
        if (polygonPoints.length === 0) {
            setIsDrawing(true);
        }
        setPolygonPoints([...polygonPoints, pos.x, pos.y]);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (label.type !== 'rectangle' || !isDrawing) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const newWidth = pos.x - startPoint.x;
    const newHeight = pos.y - startPoint.y;
    setCurrentRect({ x: startPoint.x, y: startPoint.y, width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    if (label.type !== 'rectangle' || !isDrawing) return;
    if (!onAnnotationChange || !currentRect) return;

    setIsDrawing(false);

    const newAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random() * 1000000}`,
      type: 'rectangle',
      label: label.name,
      color: label.color,
      data: {
        left: currentRect.x,
        top: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
      },
    };

    onAnnotationChange([...annotations, newAnnotation]);
    setCurrentRect(null);
  };

  const handleFinishPolygon = () => {
    if (label.type !== 'polygon' || polygonPoints.length < 6) return;
    if (!onAnnotationChange) return;

    const newAnnotation: Annotation = {
        id: String(Date.now() + Math.random()),
        type: 'polygon',
        label: label.name,
        color: label.color,
        data: {
            points: polygonPoints.reduce((acc: {x:number, y:number}[], _, i, arr) => {
                if (i % 2 === 0) {
                    acc.push({ x: arr[i]!, y: arr[i+1]! });
                }
                return acc;
            }, [])
        },
    };
    onAnnotationChange([...annotations, newAnnotation]);
    setPolygonPoints([]);
    setIsDrawing(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishPolygon();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    }
  }, [polygonPoints, label.type, onAnnotationChange]);


  // Handle selecting annotations
  const handleShapeClick = (annId: string) => {
    // TODO: implement selection logic if needed, e.g. call a parent handler
    console.log('Selected annotation:', annId);
    const selectAnnotation = annotations.find(a => a.id === annId);
    if(selectAnnotation) {
        onSelectAnnotation(selectAnnotation);
    }
  };

  return (
    <div
      onDoubleClick={handleFinishPolygon}
      style={{
        overflow: 'auto',
        maxWidth: '100vw',
        maxHeight: 'calc(100vh - 100px)',
      }}
    >
        <Stage
            width={image?.naturalWidth??800}
            height={image?.naturalHeight??600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            ref={stageRef}
        >
            <Layer>
                <KonvaImage image={image} width={image?.naturalWidth} height={image?.naturalHeight} />
                {annotations.map((ann, index) => {
                    const labelText = `${index + 1}. ${ann.label ?? '未命名'}${ann.isCrossPage ? '-跨页' : ''}`;

                    if (ann.type === 'rectangle') {
                        const textY = Math.max((ann.data.top ?? 0) - 20, 0);
                        return (
                            <Fragment key={ann.id}>
                                <KonvaRect
                                    x={ann.data.left}
                                    y={ann.data.top}
                                    width={ann.data.width}
                                    height={ann.data.height}
                                    fill="transparent"
                                    stroke={ann.color}
                                    strokeWidth={selectedAnnotationId === ann.id ? 3 : 2}
                                    onClick={() => handleShapeClick(ann.id)}
                                />
                                <KonvaText
                                    key={`${ann.id}-text`}
                                    x={ann.data.left}
                                    y={textY}
                                    text={labelText}
                                    fontSize={14}
                                    fill={ann.color}
                                    fontStyle="bold"
                                    onClick={() => handleShapeClick(ann.id)}
                                />
                            </Fragment>
                        );
                    }
                    if (ann.type === 'polygon' && ann.data.points) {
                        const flatPoints = ann.data.points.flatMap(p => [p.x, p.y]);
                        const pointCount = ann.data.points.length;
                        if (pointCount === 0) {
                            return null;
                        }
                        const centroid = ann.data.points.reduce(
                            (acc, point) => ({
                                x: acc.x + point.x / pointCount,
                                y: acc.y + point.y / pointCount,
                            }),
                            { x: 0, y: 0 }
                        );
                        return (
                            <Fragment key={ann.id}>
                                <KonvaLine
                                    points={flatPoints}
                                    fill={ann.color}
                                    opacity={0.5}
                                    closed
                                    stroke={selectedAnnotationId === ann.id ? 'black' : 'transparent'}
                                    strokeWidth={2}
                                    onClick={() => handleShapeClick(ann.id)}
                                />
                                <KonvaText
                                    key={`${ann.id}-text`}
                                    x={centroid.x}
                                    y={centroid.y}
                                    text={labelText}
                                    fontSize={14}
                                    fill={ann.color}
                                    fontStyle="bold"
                                    onClick={() => handleShapeClick(ann.id)}
                                />
                            </Fragment>
                        );
                    }
                    return null;
                })}

                {/* Drawing helpers */}
                {currentRect && (
                    <KonvaRect
                        x={currentRect.x}
                        y={currentRect.y}
                        width={currentRect.width}
                        height={currentRect.height}
                        fill={label.color}
                        opacity={0.5}
                    />
                )}
                {polygonPoints.length > 0 && (
                    <KonvaLine
                        points={polygonPoints}
                        stroke={label.color}
                        strokeWidth={2}
                        closed={false}
                    />
                )}
            </Layer>
        </Stage>
    </div>
  );
};

export default AnnotationCanvas;
