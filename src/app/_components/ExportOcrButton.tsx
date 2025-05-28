import { Button } from "antd";

import { api } from "@/trpc/react";

interface ExportOcrButtonProps {
  datasetId: string;
}

export const ExportOcrButton = ({ datasetId }: ExportOcrButtonProps) => {
  const { data, isLoading } = api.export.exportOcrAnnotations.useQuery(
    { datasetId },
  );

  const handleExport = async () => {
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr_${datasetId}_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={handleExport}
      loading={isLoading}
      type="primary"
    >
      导出
    </Button>
  );
}; 