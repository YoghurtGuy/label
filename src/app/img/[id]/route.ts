import { promises as fs } from "fs";
import path from "path";

import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getImageUrl as getAlistImageUrl } from "@/utils/alist";
import { isImageFile, getMimeTypeFromPath } from "@/utils/image";
import { getImageUrl as getS3ImageUrl } from "@/utils/s3";
// import logger from "@/utils/logger";

/**
 * 通过图片ID获取图片
 * @param request 请求对象
 * @param params 路由参数
 * @returns 图片响应
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // const imageLogger = logger.child({ name: "IMAGE", id: (await params).id });
  try {
    // 获取会话信息进行鉴权
    const session = await auth();

    if (!session?.user) {
      // imageLogger.error("未授权访问");
      return new NextResponse("未授权访问", { status: 401 });
    }

    const imageId = (await params).id;

    // 从数据库获取图片信息
    const image = await db.image.findUnique({
      where: {
        id: imageId,
      },
      include: {
        taskOnImage: {
          include: {
            task: true,
          },
        },
        dataset: true,
      },
    });

    if (!image) {
      // imageLogger.error("图片不存在", {
      //   imageId,
      //   userId: session.user.id,
      // });
      return new NextResponse("图片不存在", { status: 404 });
    }

    // 检查权限：只有被分配任务的用户才能访问图片
    if (
      !image.taskOnImage.some(
        (toi) => toi.task.assignedToId === session.user.id,
      ) &&
      image.dataset.createdById !== session.user.id
    ) {
      // imageLogger.error("您没有权限访问此图片", {
      //   imageId,
      //   userId: session.user.id,
      // });
      return new NextResponse("您没有权限访问此图片", { status: 403 });
    }

    if (image.storage === "SERVER") {
      if (env.IS_ON_VERCEL) {
        return new NextResponse("此项目部署在Vercel, 禁止访问服务器图像", { status: 400 });
      }
      const fullPath = path.join(env.SERVER_IMAGES_DIR, image.path);

      try {
        // 检查是否为文件
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
          // imageLogger.error("请求的路径不是文件", {
          //   imageId,
          //   fullPath,
          //   userId: session.user.id,
          // });
          return new NextResponse("请求的路径不是文件", { status: 400 });
        }

        // 检查文件扩展名
        if (!isImageFile(fullPath)) {
          // imageLogger.error("不支持的文件类型", {
          //   imageId,
          //   fullPath,
          //   userId: session.user.id,
          // });
          return new NextResponse("不支持的文件类型", { status: 400 });
        }

        // 读取文件
        const imageBuffer = await fs.readFile(fullPath);
        const mimeType = getMimeTypeFromPath(fullPath);

        // 返回图片响应
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=31536000",
          },
        });
      } catch (err) {
        // 安全地处理错误
        let errorMessage = "未知错误";
        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof err.message === "string"
        ) {
          errorMessage = err.message;
        }

        return new NextResponse(`获取服务器图像失败: ${errorMessage}`, {
          status: 500,
        });
      }
    } else {
      try {
        const raw_url = image.storage === "S3"? await getS3ImageUrl(image.path):await getAlistImageUrl(image.path);
        // if (raw_url) {
        //   console.log(raw_url)
        //   return NextResponse.redirect(raw_url, 302);
        // } else {
        //   return new NextResponse(`未配置相关变量`, { status: 500 });
        // }
        console.log(raw_url)
        if (raw_url) {
          const res = await fetch(raw_url);
          if (!res.ok) {
            return new NextResponse(`远程获取图片失败: ${res.statusText}`, {
              status: res.status,
            });
          }
        
          const buffer = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";

          console.log(`图像ID: ${imageId}, 成功获取图像${raw_url}`);
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000",
            },
          });
        }
      } catch (err) {
        // 安全地处理错误
        let errorMessage = "未知错误";
        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof err.message === "string"
        ) {
          errorMessage = err.message;
        }

        return new NextResponse(`获取AList图像失败: ${errorMessage}`, {
          status: 500,
        });
      }
    }
  } catch (error) {
    // imageLogger.error("获取图片时出错:", error);
    console.error("获取图片时出错:", error);
    return new NextResponse("服务器内部错误", { status: 500 });
  }
}
