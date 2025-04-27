export interface ImportProgress {
  datasetId: string;
  total: number;
  processed: number;
  currentFile: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  totalProcessed: number;
  failedFiles: string[];
} 