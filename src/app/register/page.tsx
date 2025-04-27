"use client";

import { useState } from "react";

import {
  UserOutlined,
  LockOutlined,
  UserAddOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { ProForm, ProFormText } from "@ant-design/pro-components";
import { Card } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/trpc/react";

import "@ant-design/v5-patch-for-react-19";

/**
 * 注册页面组件
 * @returns {JSX.Element} 注册页面
 */
export default function RegisterPage() {
  const router = useRouter();
  // const { token } = theme.useToken();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      router.push("/login?registered=true");
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
  });

  /**
   * 处理注册表单提交
   * @param values 表单值
   */
  const handleSubmit = async (values: {
    username: string;
    password: string;
    name: string;
    confirmPassword: string;
    inviteCode?: string;
  }) => {
    setIsLoading(true);
    setError("");

    // 验证密码
    if (values.password !== values.confirmPassword) {
      setError("两次输入的密码不一致");
      setIsLoading(false);
      return;
    }

    // 验证密码强度
    if (values.password.length < 6) {
      setError("密码长度至少为6个字符");
      setIsLoading(false);
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: values.username,
        password: values.password,
        name: values.name,
        inviteCode: values.inviteCode,
      });
    } catch (err) {
      console.error("注册错误:", err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat p-4">
      <Card className="w-full max-w-md" title="注册">
        <ProForm
          // title="注册"
          // subTitle="创建您的图像标注系统账号"
          onFinish={handleSubmit}
          submitter={{
            searchConfig: {
              submitText: "注册",
            },
          }}
          loading={isLoading}
        >
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-500">
              {error}
            </div>
          )}
          <ProFormText
            name="name"
            fieldProps={{
              size: "large",
              prefix: <UserAddOutlined className="text-gray-400" />,
            }}
            placeholder="请输入您的姓名"
            rules={[
              {
                required: true,
                message: "请输入您的姓名!",
              },
            ]}
          />
          <ProFormText
            name="username"
            fieldProps={{
              size: "large",
              prefix: <UserOutlined className="text-gray-400" />,
            }}
            placeholder="请输入用户名"
            rules={[
              {
                required: true,
                message: "请输入用户名!",
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: "large",
              prefix: <LockOutlined className="text-gray-400" />,
            }}
            placeholder="请输入密码"
            rules={[
              {
                required: true,
                message: "请输入密码！",
              },
              {
                min: 6,
                message: "密码长度至少为6个字符",
              },
            ]}
          />
          <ProFormText.Password
            name="confirmPassword"
            fieldProps={{
              size: "large",
              prefix: <LockOutlined className="text-gray-400" />,
            }}
            placeholder="请再次输入密码"
            rules={[
              {
                required: true,
                message: "请再次输入密码！",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          />
          <ProFormText
            name="inviteCode"
            fieldProps={{
              size: "large",
              prefix: <KeyOutlined className="text-gray-400" />,
            }}
            placeholder="请输入邀请码"
          />
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-500">
              已有账号？{" "}
              <Link
                href="/login"
                className="text-blue-500 hover:text-blue-600 hover:underline"
              >
                登录
              </Link>
            </p>
          </div>
        </ProForm>
      </Card>
    </div>
  );
}
