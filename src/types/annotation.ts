// 标注类型定义
export interface AnnotationData {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  fill?: string;
  opacity?: number;
}

export type Annotation = {
  id: string;
  type: "rectangle" | "polygon";
  label: string;
  labelId?: string;
  color: string;
  data: AnnotationData;
  score?: number;
  questionNumber?: number;
};
