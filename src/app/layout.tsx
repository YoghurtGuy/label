import "@/styles/globals.css";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "@/trpc/react";

import NavbarWrapper from "./_components/NavbarWrapper";
import { antdConfig } from "./antdConifg";

export const metadata: Metadata = {
  title: "图像标注系统",
  description: "用于标注深度学习目标检测和 OCR 识别的数据集",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <SessionProvider>
            <AntdRegistry>
              <ConfigProvider theme={antdConfig.theme}>
                <App>
                  <div className="min-h-screen flex flex-col">
                    <NavbarWrapper />
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </App>
              </ConfigProvider>
            </AntdRegistry>
          </SessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
