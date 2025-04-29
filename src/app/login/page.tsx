"use client";

import { useState, useEffect, Suspense } from "react";

import {
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormText,
} from '@ant-design/pro-components';
import { Card } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// import logger from "@/utils/logger";
/**
 * 登录页面组件
 * @returns {JSX.Element} 登录页面
 */
function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // const loginLogger = logger.child({ name: "LOGIN" });
  useEffect(() => {
    // 检查是否有注册成功的消息
    if (searchParams.get("registered") === "true") {
      setSuccess("注册成功，请登录");
    }
  }, [searchParams]);

  /**
   * 处理登录表单提交
   * @param values 表单值
   */
  const handleSubmit = async (values: { username: string; password: string }) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await signIn("password", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户名或密码错误");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("登录过程中发生错误，请稍后再试");
      // loginLogger.error("登录错误:", err);
      console.error("登录错误:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat p-4">
      <Card className="w-full max-w-md">
        <LoginForm
          logo="/logo.png"
          title="图像标注系统"
          subTitle="欢迎使用图像标注系统"
          onFinish={handleSubmit}
          loading={isLoading}
          submitter={{
            searchConfig: {
              submitText: '登录',
            },
          }}
        >
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-500 border border-green-200">
              {success}
            </div>
          )}
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined className="text-gray-400" />,
            }}
            placeholder={'请输入用户名'}
            rules={[
              {
                required: true,
                message: '请输入用户名!',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined className="text-gray-400" />,
            }}
            placeholder={'请输入密码'}
            rules={[
              {
                required: true,
                message: '请输入密码！',
              },
            ]}
          />
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              还没有账号？{" "}
              <Link href="/register" className="text-blue-500 hover:text-blue-600 hover:underline">
                注册
              </Link>
            </p>
          </div>
        </LoginForm>
      </Card>
    </div>
  );
}

/**
 * 登录页面组件
 * @returns {JSX.Element} 登录页面
 */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
