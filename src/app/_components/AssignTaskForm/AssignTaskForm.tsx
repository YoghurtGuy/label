import React from "react";

import {
  ProForm,
  ProFormSelect,
  ProFormDigitRange,
  ProFormText,
  ProFormList,
  ProFormGroup,
} from "@ant-design/pro-components";
import { Modal, Row, Col, Card } from "antd";

import { type CreateTaskInput } from "@/types/task";
import { transIndex } from "@/utils/transIndex";

import { useAssignTaskForm, type AssignTaskFormProps } from "./hooks";
/**
 * 分配任务表单组件
 * 用于创建和分配标注任务
 */
const AssignTaskForm: React.FC<AssignTaskFormProps> = (props) => {
  const { users, dataset, isLoading, handleFormFinish, handleCancel } =
    useAssignTaskForm(props);

  const { open, title } = props;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={800}
      destroyOnClose
      footer={null}
    >
      <ProForm<CreateTaskInput>
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
        disabled={isLoading}
      >
        <Row gutter={16}>
          <Col span={16}>
            <ProFormText name="name" label="任务名称" rules={[{ required: true, message: "请输入任务名称" }]} />
            <ProFormText name="description" label="任务描述" rules={[{ required: true, message: "请输入任务描述" }]} />
          </Col>
          <Col span={8}>
            <div>
            <Card size="small">
              <div className="text-sm font-bold">
                未分配序号
              </div>
              <div>
                {transIndex(dataset?.index.unassigned ?? [])}
              </div>
            </Card>
            </div>
            <div className="mt-2">
            <Card size="small">
              <div className="text-sm font-bold">
                未标注序号
              </div>
              <div>
                {transIndex(dataset?.index.unannotated ?? [])}
              </div>
            </Card>
            </div>
          </Col>
        </Row>

        <ProFormList name="assignedTo" label="标注人员">
          <ProFormGroup key="group" layout="vertical">
            <ProFormSelect
              name="userId"
              label="选择标注人员"
              options={users?.map((user) => ({
                label: user.name,
                value: user.id,
              }))}
              rules={[{ required: true, message: "请选择标注人员" }]}
            />
            <ProFormDigitRange
              name="indexRange"
              label="图像序号"
              min={1}
              max={dataset?.imageCount ?? 0}
              rules={[{ required: true, message: "请输入图像序号" }]}
            />
          </ProFormGroup>
        </ProFormList>
      </ProForm>
    </Modal>
  );
};

export default AssignTaskForm;
