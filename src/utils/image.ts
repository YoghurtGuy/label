import "server-only";
// import { type PathLike } from 'fs';
import { promises as fs } from "fs";
import path from "path";

import { type Image } from "@prisma/client";
import sharp from "sharp";

import { env } from "@/env";
// import logger from './logger';

// const imageLogger = logger.child({ name: "IMAGE" });

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * 获取图像的尺寸信息
 * @param imagePath 图像文件路径
 * @returns Promise<{width: number, height: number}>
 */
export async function getImageDimensions(imagePath: string) {
  const metadata = await sharp(imagePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`无法获取图像尺寸: ${imagePath}`);
  }
  return {
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * 获取图像的元数据
 * @param imagePath 图像文件路径
 * @returns Promise<ImageMetadata>
 */
export async function getImageMetadata(
  imagePath: string,
): Promise<ImageMetadata> {
  try {
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imagePath).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error("无法获取图像元数据");
    }

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取图像元数据失败: ${error.message}`);
    }
    throw new Error("获取图像元数据时出现未知错误");
  }
}

/**
 * 检查文件是否为图像文件
 * @param filename 文件名
 * @returns boolean
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * 递归遍历目录，获取所有图像文件
 * @param dirPath 目录路径
 * @returns Promise<Array<{filename: string, path: string}>>
 */
export async function getImagesFromDirectory(
  dirPath: string,
): Promise<Array<{ filename: string; path: string }>> {
  if (env.IS_ON_VERCEL) {
    throw new Error(`项目部署在 Vercel, 禁止访问服务器文件系统`);
  }
  const images: Array<{ filename: string; path: string }> = [];
  const fullDirPath = path.join(env.SERVER_IMAGES_DIR, dirPath);
  try {
    const exists = await fs
      .access(fullDirPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new Error(`目录不存在: ${fullDirPath}`);
    }

    async function processDirectory(currentPath: string): Promise<void> {
      try {
        const items = await fs.readdir(currentPath);

        for (const item of items) {
          try {
            const fullPath = path.join(currentPath, item);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
              await processDirectory(fullPath);
            } else if (stat.isFile() && isImageFile(item)) {
              images.push({
                filename: item,
                path: path.relative(env.SERVER_IMAGES_DIR, fullPath),
              });
            }
          } catch (itemError) {
            // imageLogger.error(`处理文件 ${item} 时出错:`, itemError);
            console.error(`处理文件 ${item} 时出错:`, itemError);
            // 继续处理下一个文件
          }
        }
      } catch (dirError) {
        // imageLogger.error(`处理目录 ${currentPath} 时出错:`, dirError);
        console.error(`处理目录 ${currentPath} 时出错:`, dirError);
        throw dirError;
      }
    }

    await processDirectory(fullDirPath);
    return images;
  } catch (error) {
    if (error instanceof Error) {
      // imageLogger.error(`处理目录时出错: ${error.message}`);
      console.error(`处理目录时出错: ${error.message}`);
      throw new Error(`处理目录时出错: ${error.message}`);
    }
    // imageLogger.error('处理目录时出现未知错误');
    console.error("处理目录时出现未知错误");
    throw new Error("处理目录时出现未知错误");
  }
}

/**
 * 批量处理图像文件并返回尺寸信息
 * @param images 图像文件列表
 * @returns Promise<Array<{filename: string, path: string, width: number, height: number}>>
 */
export async function processImages(
  images: Array<{ filename: string; path: string }>,
) {
  const results = [];

  for (const image of images) {
    try {
      const dimensions = await getImageDimensions(image.path);
      results.push({
        ...image,
        ...dimensions,
      });
    } catch (error) {
      // imageLogger.error(`处理图像失败: ${image.path}`, error);
      console.error(`处理图像失败: ${image.path}`, error);
      // 跳过处理失败的图像
      continue;
    }
  }

  return results;
}

/**
 * 根据文件扩展名获取MIME类型
 * @param path 文件路径
 * @returns MIME类型
 */
export const getMimeTypeFromPath = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "tiff":
    case "tif":
      return "image/tiff";
    default:
      return "image/jpeg"; // 默认类型
  }
};

/**
 * Base64格式转为Blob
 * @param base64 图像文件路径
 * @param mimeType 输出路径
 * @returns Promise<string>
 */
export async function convertBase64ToUrl(
  base64: string,
  mimeType: string,
): Promise<string> {
  const imageBuffer = await fs.readFile(base64);
  const imageBlob = new Blob([imageBuffer], { type: mimeType });
  return URL.createObjectURL(imageBlob);
}
const joinUrl = (...parts: string[]): string =>
  parts
    .filter(Boolean)
    .map(
      (part, index) =>
        index === 0
          ? part.replace(/\/+$/, "") // 去掉首段末尾 /
          : part.replace(/^\/+|\/+$/g, ""), // 中间部分去两端 /
    )
    .join("/");

export const getImageSrc = (image: Image): string | undefined => {
  switch (image.storage) {
    case "WEB":
      if (env.ALIST_URL) {
        return joinUrl(
          env.ALIST_URL,
          "d",
          env.ALIST_IMAGES_DIR,
          image.path,
        );
      }
    // fallback to S3 logic
    case "S3":
      const base = env.AWS_URL ?? env.AWS_ENDPOINT;
      if (!base) return undefined;
      return joinUrl(base, env.AWS_IMAGES_DIR ?? "", image.path);

    case "SERVER":
      return `/img/${image.id}`;

    default:
      return undefined;
  }
};


export async function urlToGenerativePart(url: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // 取得圖片的 MIME 類型 (例如 'image/jpeg', 'image/png')
    const contentType = response.headers.get("content-type");
    if (!contentType) {
      throw new Error("Could not determine image content type.");
    }
    
    // 將圖片數據轉換為 Buffer，再轉為 Base64 字串
    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    return {
      inlineData: {
        data: base64Data,
        mimeType: contentType,
      },
    };
  } catch (error) {
    console.error("Error converting URL to generative part:", error);
    throw error; // 將錯誤向上拋出，以便在主處理函數中捕獲
  }
}
