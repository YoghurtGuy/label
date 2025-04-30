import { useState, useRef, useEffect } from "react";

import { App } from "antd";
import { type Color } from "antd/es/color-picker";
import { type FormInstance } from "antd/es/form";
import { type RadioChangeEvent } from "antd/es/radio";
import { type UploadFile } from "antd/es/upload/interface";

import { api } from "@/trpc/react";
import {
  type Dataset,
  type Label,
  type ImportMethod,
  type CreateDatasetInput,
} from "@/types/dataset";

// 预定义的颜色数组，这些颜色经过精心选择，彼此之间差异较大
export const DISTINCT_COLORS = [
  "#FF6B6B", // 红色
  "#4ECDC4", // 青色
  "#45B7D1", // 蓝色
  "#96CEB4", // 绿色
  "#FFEEAD", // 黄色
  "#D4A5A5", // 粉色
  "#9B59B6", // 紫色
  "#3498DB", // 深蓝色
  "#E67E22", // 橙色
  "#2ECC71", // 绿色
  "#1ABC9C", // 青绿色
  "#F1C40F", // 黄色
  "#E74C3C", // 红色
  "#34495E", // 深灰色
  "#16A085", // 深青色
];

export interface DatasetFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  initialValues?: Partial<Dataset>;
  title: string;
}

export const useDatasetForm = (props: DatasetFormProps) => {
  const { initialValues, onCancel, onSuccess } = props;
  const [importMethod, setImportMethod] =
    useState<ImportMethod>("SERVER_FOLDER");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [datasetType, setDatasetType] = useState<"OBJECT_DETECTION" | "OCR">(
    initialValues?.type ?? "OBJECT_DETECTION",
  );
  // const [subscriptionDatasetId, setSubscriptionDatasetId] = useState<string | null>(null);
  // const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const colorIndexRef = useRef(0);
  const utils = api.useUtils();
  const app = App.useApp();
  // 获取目录树
  const { data: directoryTreeData, isLoading: isLoadingDirectoryTree } =
    api.dataset.getDirectoryTree.useQuery(
      { path: "/", maxDepth: 5 },
      { enabled: importMethod === "SERVER_FOLDER" && props.open },
    );

  // 订阅导入进度
  // api.dataset.onImportProgress.useSubscription(subscriptionDatasetId!, {
  //   onData: (progress: ImportProgress) => {
  //     setImportProgress(progress);
  //     if (progress.status === "completed") {
  //       message.success("导入完成");
  //       onCancel();
  //       setSubscriptionDatasetId(null);
  //       setImportProgress(null);
  //     } else if (progress.status === "error") {
  //       message.error(progress.error ?? "导入失败");
  //       setImportProgress(null);
  //       setSubscriptionDatasetId(null);
  //     }
  //   },
  //   onError: (err: TRPCClientErrorLike<AppRouter>) => {
  //     message.error(err.message);
  //     setImportProgress(null);
  //     setSubscriptionDatasetId(null);
  //   },
  //   enabled: !!subscriptionDatasetId,
  // })
  // 初始化颜色索引
  useEffect(() => {
    if (initialValues?.labels && initialValues.labels.length > 0) {
      // 如果已有标签，将颜色索引设置为标签数量，这样新添加的标签会从下一个颜色开始
      colorIndexRef.current = initialValues.labels.length;
    }
    if (initialValues?.type) {
      setDatasetType(initialValues.type);
    }
  }, [initialValues]);

  const handleImportMethodChange = (e: RadioChangeEvent) => {
    setImportMethod(e.target.value as ImportMethod);
  };

  const handleDatasetTypeChange = (e: RadioChangeEvent) => {
    setDatasetType(e.target.value as "OBJECT_DETECTION" | "OCR");
  };

  const handleColorChange = (
    color: Color,
    index: number,
    form: FormInstance,
  ) => {
    const labels = form.getFieldValue("labels") as Omit<Label, "id">[];
    if (labels[index]) {
      labels[index].color = color.toHexString();
      form.setFieldsValue({ labels });
    }
  };

  // 获取下一个不相似的颜色
  const getNextDistinctColor = () => {
    const color =
      DISTINCT_COLORS[colorIndexRef.current % DISTINCT_COLORS.length];
    colorIndexRef.current =
      (colorIndexRef.current + 1) % DISTINCT_COLORS.length;
    return color;
  };

  // 创建新标签时的回调
  const handleAddLabel = () => {
    const newColor = getNextDistinctColor();
    return {
      name: "",
      color: newColor,
      description: "",
    };
  };

  // 创建数据集
  const createDataset = api.dataset.create.useMutation({
    onSuccess: async () => {
      app.message.success("数据集创建成功");
      await utils.dataset.getAll.invalidate();
      if (onSuccess) {
        onSuccess();
      }
      onCancel();
    },
  });

  // 更新数据集
  const updateDataset = api.dataset.update.useMutation({
    onSuccess: async () => {
      app.message.success("数据集更新成功");
      await utils.dataset.getAll.invalidate();
      if (onSuccess) {
        onSuccess();
      }
      onCancel();
    },
  });

  const handleFormFinish = async (values: CreateDatasetInput) => {
    const formValues = values;

    const submitValues = {
      ...formValues,
      labels: datasetType === "OCR" ? [] : formValues.labels,
    };

    try {
      let result;

      if (initialValues?.id) {
        // 更新数据集
        result = await updateDataset.mutateAsync({
          id: initialValues.id,
          name: submitValues.name,
          description: submitValues.description,
          type: submitValues.type,
          labels: submitValues.labels,
          prompts: submitValues.prompts,
        });
      } else {
        // 创建数据集
        result = await createDataset.mutateAsync({
          name: submitValues.name,
          description: submitValues.description,
          type: submitValues.type,
          labels: submitValues.labels,
          prompts: submitValues.prompts,
          importMethod: submitValues.importMethod,
          serverPath: submitValues.serverPath,

          // TODO：上传图像，新建文件夹
        });
      }

      if (!result) {
        throw new Error(
          initialValues?.id ? "更新数据集失败" : "创建数据集失败",
        );
      }

      // 如果是服务器文件夹导入，订阅进度更新
      // if (formValues.importMethod === "SERVER_FOLDER" && result?.id) {
      //   setSubscriptionDatasetId(result.id);
      // } else {
      //   onCancel();
      // }
      return true;
    } catch (error) {
      if (error instanceof Error) {
        app.message.error(error.message);
      }
      return false;
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return {
    importMethod,
    fileList,
    setFileList,
    datasetType,
    // importProgress,
    colorIndexRef,
    directoryTreeData,
    isLoadingDirectoryTree,
    handleImportMethodChange,
    handleDatasetTypeChange,
    handleColorChange,
    handleAddLabel,
    handleFormFinish,
    handleCancel,
  };
};
