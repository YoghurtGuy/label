export type DatasetStatus = "processing" | "success" | "error";

export type DatasetType = "OBJECT_DETECTION" | "OCR";

export type ImportMethod = "BROWSER_UPLOAD" | "SERVER_FOLDER";

export interface DatasetContent {
  label: string;
  value: number | string;
  status?: DatasetStatus;
}
interface stats {
  imageCount: number;
  annotatedImageCount: number;
  annotationCount: number;
  preAnnotatedImageCount: number;
}
export interface statsWithDatasetId extends stats {
  datasetId: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  type?: "rectangle" | "polygon" | "select";
}

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  prompts: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  type: DatasetType;
  labels: Label[];
  content?: DatasetContent[];
  stats?: stats;
}

export interface CreateDatasetInput {
  name: string;
  description: string;
  type: DatasetType;
  labels: Omit<Label, "id">[];
  importMethod: ImportMethod;
  serverPath: string[];
  prompts?: string;
  preAnnotation?: File;
}

export interface UpdateDatasetInput
  extends Partial<Omit<CreateDatasetInput, "importMethod" | "serverPath">> {
  id: string;
}

// 定义树节点类型
export interface TreeNode {
  label: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}