import React from "react";

import {
  PlusOutlined,
  UploadOutlined,
  FolderOutlined,
  CompassOutlined,
  AmazonOutlined,
} from "@ant-design/icons";
import {
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormRadio,
  ProFormList,
  ProFormGroup,
  ProFormTreeSelect,
  ProFormUploadDragger
} from "@ant-design/pro-components";
import { Modal, Upload, Button, ColorPicker, message } from "antd";
// import type { Color } from "antd/es/color-picker";
// import type { FormListFieldData } from "antd/es/form";
import type { FormInstance } from "antd/es/form";

import { type CreateDatasetInput } from "@/types/dataset";

import {
  useDatasetForm,
  type DatasetFormProps,
  DISTINCT_COLORS,
} from "./hooks";

/**
 * 数据集表单组件
 * 用于创建和编辑数据集
 */
const DatasetForm: React.FC<DatasetFormProps> = (props) => {
  const {
    importMethod,
    fileList,
    setFileList,
    datasetType,
    // importProgress,
    directoryTreeData,
    isLoadingDirectoryTree,
    handleImportMethodChange,
    handleDatasetTypeChange,
    handleColorChange,
    handleAddLabel,
    handleFormFinish,
    handleCancel,
  } = useDatasetForm(props);

  const { open, initialValues, title } = props;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={700}
      destroyOnClose
      footer={null}
    >
      <ProForm<CreateDatasetInput>
        layout="vertical"
        initialValues={{
          ...initialValues,
          type: initialValues?.type ?? datasetType ?? "OBJECT_DETECTION",
          labels:
            initialValues?.labels?.map((label, index) => ({
              ...label,
              // 如果标签没有颜色，则使用预定义的不相似颜色
              color:
                label.color || DISTINCT_COLORS[index % DISTINCT_COLORS.length],
            })) ?? [],
          importMethod: "SERVER_FOLDER",
        }}
        onFinish={handleFormFinish}
        submitter={{
          searchConfig: {
            submitText: "提交",
            resetText: "取消",
          },
          resetButtonProps: {
            onClick: handleCancel,
          },
        }}
      >
        <ProFormText
          name="name"
          label="数据集名称"
          placeholder="请输入数据集名称"
          rules={[{ required: true, message: "请输入数据集名称" }]}
        />

        <ProFormTextArea
          name="description"
          label="数据集描述"
          placeholder="请输入数据集描述"
          rules={[{ required: true, message: "请输入数据集描述" }]}
        />

        <ProFormRadio.Group
          name="type"
          label="数据集类型"
          options={[
            { label: "目标检测", value: "OBJECT_DETECTION" },
            { label: "OCR识别", value: "OCR" },
          ]}
          rules={[{ required: true, message: "请选择数据集类型" }]}
          fieldProps={{
            onChange: handleDatasetTypeChange,
          }}
        />

        {datasetType === "OBJECT_DETECTION" && (
          <ProFormList
            name="labels"
            label="标签列表"
            creatorButtonProps={{
              creatorButtonText: "添加标签",
              icon: <PlusOutlined />,
            }}
            creatorRecord={handleAddLabel}
            copyIconProps={false}
          >
            {(f, index) => {
              return (
                <ProFormGroup key="label-list">
                  <ProFormText
                    name="name"
                    label="标签名称"
                    placeholder="标签名称"
                    rules={[{ required: true, message: "请输入标签名称" }]}
                  />
                  <ProForm.Item
                    name="color"
                    label="颜色"
                    rules={[{ required: true, message: "请选择标签颜色" }]}
                  >
                    <ColorPicker
                      defaultValue="#1890ff"
                      onChange={(color) => {
                        // 使用 FormListFieldData 的 form 属性
                        const form = (f as unknown as { form: FormInstance })
                          .form;
                        if (form) {
                          handleColorChange(color, index, form);
                        }
                      }}
                    />
                  </ProForm.Item>
                  <ProFormText
                    name="description"
                    label="标签描述"
                    placeholder="标签描述（可选）"
                  />
                </ProFormGroup>
              );
            }}
          </ProFormList>
        )}
        {datasetType === "OCR" && (
          <ProFormTextArea
            name="prompts"
            label="提示词"
            placeholder="请输入提示词"
            rules={[{ required: true, message: "请输入提示词" }]}
          />
        )}
        {!initialValues && (
          <>
            <ProFormRadio.Group
              name="importMethod"
              label="图像导入方式"
              options={[
                { label: "服务器文件夹", value: "SERVER_FOLDER" },
                { label: "浏览器上传（暂未支持）", value: "BROWSER_UPLOAD" },
              ]}
              rules={[{ required: true, message: "请选择图像导入方式" }]}
              fieldProps={{
                onChange: handleImportMethodChange,
              }}
            />

            {importMethod === "BROWSER_UPLOAD" && (
              <ProForm.Item label="上传图像">
                <Upload
                  multiple
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={(file) => {
                    const isIMG = file.type.startsWith("image");
                    if (!isIMG) {
                      message.error(`${file.name} 不是图像文件`);
                    }
                    return isIMG || Upload.LIST_IGNORE;
                  }}
                >
                  <Button icon={<UploadOutlined />}>选择图像文件</Button>
                </Upload>
              </ProForm.Item>
            )}

            {importMethod === "SERVER_FOLDER" && (
              <ProFormTreeSelect
                name="serverPath"
                label="服务器文件夹路径"
                placeholder="请选择服务器文件夹路径"
                fieldProps={{
                  multiple:true,
                  prefix: <FolderOutlined />,
                  loading: isLoadingDirectoryTree,
                  treeData: directoryTreeData,
                  treeTitleRender: (nodeData) => (
                    <div className="flex items-center gap-2">
                      <div>{`${nodeData.label}`}</div>
                      {nodeData.value?.toString().startsWith("web:") && (
                        <CompassOutlined />
                      )}
                      {nodeData.value?.toString().startsWith("s3:") && (
                        <AmazonOutlined />
                      )}
                    </div>
                  ),
                }}
                rules={[{ required: true, message: "请选择服务器文件夹路径" }]}
              />
            )}

            {/* {importProgress && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={Math.round(
                    (importProgress.processed / importProgress.total) * 100,
                  )}
                  status={
                    importProgress.status === "error" ? "exception" : "active"
                  }
                />
                <div style={{ marginTop: 8, color: "#666" }}>
                  {importProgress.status === "processing" && (
                    <>正在处理: {importProgress.currentFile}</>
                  )}
                  {importProgress.status === "completed" && (
                    <>处理完成: 共处理 {importProgress.processed} 个文件</>
                  )}
                  {importProgress.status === "error" && (
                    <>处理出错: {importProgress.error}</>
                  )}
                </div>
              </div>
            )} */}
          </>
        )}
        {initialValues && (
          <ProFormUploadDragger
            fieldProps={{
              accept: ".jsonl",
              maxCount: 1,
              fileList: fileList,
              onChange: ({ fileList }) => setFileList(fileList),
              beforeUpload: (file: File) => {
                const isJsonl = file.name.endsWith(".jsonl");
                if (!isJsonl) {
                  message.error(`${file.name} 不是有效的预标注文件`);
                }
                return isJsonl ?? Upload.LIST_IGNORE;
              }
            }}
            extra="支持小于100mb的 .jsonl 格式的预标注文件，每行包含 imageUrl 和 output 字段"
          />
        )}
      </ProForm>
    </Modal>
  );
};

export default DatasetForm;
