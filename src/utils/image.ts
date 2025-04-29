import 'server-only';
// import { type PathLike } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

import sharp from 'sharp';

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
export async function getImageMetadata(imagePath: string): Promise<ImageMetadata> {
  try {
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error('无法获取图像元数据');
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
    throw new Error('获取图像元数据时出现未知错误');
  }
}

/**
 * 检查文件是否为图像文件
 * @param filename 文件名
 * @returns boolean
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * 递归遍历目录，获取所有图像文件
 * @param dirPath 目录路径
 * @returns Promise<Array<{filename: string, path: string}>>
 */
export async function getImagesFromDirectory(dirPath: string): Promise<Array<{filename: string, path: string}>> {
  const images: Array<{filename: string, path: string}> = [];
  
  try {
    const exists = await fs.access(dirPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`目录不存在: ${dirPath}`);
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
                path: fullPath,
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

    await processDirectory(dirPath);
    return images;
  } catch (error) {
    if (error instanceof Error) {
      // imageLogger.error(`处理目录时出错: ${error.message}`);
      console.error(`处理目录时出错: ${error.message}`);
      throw new Error(`处理目录时出错: ${error.message}`);
    }
    // imageLogger.error('处理目录时出现未知错误');
    console.error('处理目录时出现未知错误');
    throw new Error('处理目录时出现未知错误');
  }
}

/**
 * 批量处理图像文件并返回尺寸信息
 * @param images 图像文件列表
 * @returns Promise<Array<{filename: string, path: string, width: number, height: number}>>
 */
export async function processImages(images: Array<{filename: string, path: string}>) {
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
  const extension = path.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'bmp':
      return 'image/bmp';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    default:
      return 'image/jpeg'; // 默认类型
  }
};

/**
 * Base64格式转为Blob
 * @param base64 图像文件路径
 * @param mimeType 输出路径
 * @returns Promise<string>
 */
export async function convertBase64ToUrl(base64: string, mimeType: string): Promise<string> {
  const imageBuffer = await fs.readFile(base64);
  const imageBlob = new Blob([imageBuffer], { type: mimeType });
  return URL.createObjectURL(imageBlob);
}
