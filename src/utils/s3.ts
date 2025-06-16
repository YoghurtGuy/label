import path from "path";

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  type ListObjectsV2CommandInput,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";
import type { TreeNode } from "@/types/dataset";

import { isImageFile } from "./image";

// 创建 S3 客户端

async function getS3Client() {
  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      endpoint: env.AWS_ENDPOINT,
    });
    return s3Client;
  }
  console.log("无S3配置");
  return undefined;
}
/**
 * 获取图片的预签名 URL
 * @param key S3 对象的键
 * @returns 预签名的 URL
 */
export async function getImageUrl(key: string): Promise<string | undefined> {
  const s3Client = await getS3Client();
  if (s3Client === undefined) {
    return undefined;
  }
  try {
    const command = new GetObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: env.AWS_IMAGES_DIR ? path.join(env.AWS_IMAGES_DIR, key) : key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("获取图片 URL 出错:", error);
    return undefined;
  }
}

// /**
//  * 列出指定前缀的所有对象
//  * @param prefix 要列出的前缀
//  * @returns 对象列表
//  */
// export async function list(prefix: string) {
//   try {
//     const command = new ListObjectsV2Command({
//       Bucket: env.S3_BUCKET_NAME,
//       Prefix: prefix,
//       Delimiter: "/",
//     });

//     const response = await s3Client.send(command);
//     return {
//       contents: response.Contents || [],
//       commonPrefixes: response.CommonPrefixes || [],
//     };
//   } catch (error) {
//     console.error("列出对象出错:", error);
//     return { contents: [], commonPrefixes: [] };
//   }
// }

/**
 * 获取所有图片文件
 * @param prefix 要搜索的前缀
 * @returns 图片文件列表
 */
export async function getImages(
  prefix: string,
): Promise<Array<{ filename: string; path: string }>> {
  const s3Client = await getS3Client();
  if (s3Client === undefined) return [];
  let prefix_true = prefix;
  if (env.AWS_IMAGES_DIR) prefix_true = path.join(env.AWS_IMAGES_DIR, prefix);

  const images: Array<{ filename: string; path: string }> = [];
  let continuationToken: string | undefined = undefined;

  try {
    while (true) {
      const command = new ListObjectsV2Command({
        Bucket: env.BUCKET_NAME,
        Prefix: prefix_true,
        ContinuationToken: continuationToken,
      } as ListObjectsV2CommandInput);

      const response: ListObjectsV2CommandOutput = await s3Client.send(command);

      for (const item of response.Contents ?? []) {
        if (item.Key && isImageFile(item.Key)) {
          const relativePath = env.AWS_IMAGES_DIR
            ? path.relative(env.AWS_IMAGES_DIR, item.Key)
            : item.Key;
          images.push({
            filename: path.basename(item.Key),
            path: relativePath,
          });
        }
      }

      if (response.IsTruncated) {
        continuationToken = response.NextContinuationToken;
      } else {
        break;
      }
    }

    return images;
  } catch (error) {
    console.error("获取图片出错:", error);
    return [];
  }
}

/**
 * 获取文件夹树结构
 * @param prefix 要获取的文件夹前缀
 * @returns 文件夹树结构
 */
// export async function getFolderTree(
//   prefix: string | undefined = undefined,
//   isFirst=true
// ): Promise<TreeNode[]> {
//   const s3Client = await getS3Client();
//   if (s3Client === undefined) {
//     return [];
//   }
//   let prefix_true=prefix;
//   if(isFirst&&env.AWS_IMAGES_DIR)
//     prefix_true = prefix?path.join(env.AWS_IMAGES_DIR, prefix):env.AWS_IMAGES_DIR;

//   try {
//     const command = new ListObjectsV2Command({
//       Bucket: env.BUCKET_NAME,
//       Prefix: prefix_true,
//       Delimiter: "/",
//     });

//     const response = await s3Client.send(command);
//     const tree: TreeNode[] = [];

//     for (const commonPrefix of response.CommonPrefixes ?? []) {
//       if (commonPrefix.Prefix) {
//         const folderName = path.basename(commonPrefix.Prefix.slice(0, -1));
//         const children = await getFolderTree(commonPrefix.Prefix, false);

//         const relativePath= env.AWS_IMAGES_DIR?path.relative(env.AWS_IMAGES_DIR,commonPrefix.Prefix):commonPrefix.Prefix
//         tree.push({
//           label: folderName,
//           value: `s3:${relativePath}`,
//           key: `s3:${relativePath}`,
//           isLeaf: children.length === 0,
//           children: children.length > 0 ? children : undefined,
//         });
//       }
//     }
//     return tree;
//   } catch (error) {
//     console.error("获取文件夹树出错:", error);
//     return [];
//   }
// }

export async function getFolderTree(
  prefix?: string,
  maxDepth = 2,
  currentDepth = 0,
): Promise<TreeNode[]> {
  const result: TreeNode[] = [];
  const s3Client = await getS3Client();
  if (s3Client === undefined) {
    return [];
  }
  const prefix_true = prefix
    ? currentDepth === 0
      ? path.join(env.AWS_IMAGES_DIR ?? "", prefix)
      : prefix
    : (env.AWS_IMAGES_DIR ?? "");

  let continuationToken: string | undefined = undefined;
  try {
    do {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: env.BUCKET_NAME,
        Prefix: prefix_true,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      // 子“文件夹”
      for (const commonPrefix of response.CommonPrefixes ?? []) {
        const folderName = commonPrefix
          .Prefix!.slice(prefix_true.length)
          .replace(/\/$/, "");
        const relativePath =
          env.AWS_IMAGES_DIR && commonPrefix.Prefix
            ? path.relative(env.AWS_IMAGES_DIR, commonPrefix.Prefix)
            : commonPrefix.Prefix;
        const folderNode: TreeNode = {
          label: folderName,
          value: `s3:${relativePath}`,
          key: `s3:${relativePath}`,
          isLeaf: false,
          children: [],
        };

        if (currentDepth < maxDepth) {
          folderNode.children = await getFolderTree(
            commonPrefix.Prefix,
            maxDepth,
            currentDepth + 1,
          );
          if (folderNode.children.length === 0) folderNode.isLeaf = true;
        }

        result.push(folderNode);
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return result;
  } catch (error) {
    console.error("获取文件夹树出错:", error);
    return [];
  }
}

/**
 * 移动 S3 文件
 * @param srcKey 源文件键
 * @param dstKey 目标文件键
 * @returns 是否成功
 */
export async function moveFile(
  srcKey: string,
  dstKey: string,
): Promise<boolean> {
  const s3Client = await getS3Client();
  if (s3Client === undefined) {
    return false;
  }

  try {
    // 复制到新位置
    const copyCommand = new CopyObjectCommand({
      Bucket: env.BUCKET_NAME,
      CopySource: `${env.BUCKET_NAME}/${srcKey}`,
      Key: dstKey,
    });
    await s3Client.send(copyCommand);

    // 删除原文件
    const deleteCommand = new DeleteObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: srcKey,
    });
    await s3Client.send(deleteCommand);

    return true;
  } catch (error) {
    console.error("移动文件出错:", error);
    return false;
  }
}
