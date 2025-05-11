import path from "path";

import { env } from "@/env";
import type {
  getResponse,
  listResponse,
  listContent,
  Response,
} from "@/types/alist";
import type { TreeNode } from "@/types/dataset";

import { isImageFile } from "./image";
function getHeader() {
  if (!env.ALIST_TOKEN || !env.ALIST_IMAGES_DIR || !env.ALIST_URL) {
    console.log("未设置ALIST_TOKEN或ALIST_IMAGES_DIR或ALIST_URL");
    return null;
  }
  const myHeaders = new Headers();
  myHeaders.append("Authorization", env.ALIST_TOKEN);
  myHeaders.append("Content-Type", "application/json");
  return myHeaders;
}
async function fetchJson<T>(
  url: string,
  requestOptions?: RequestInit,
): Promise<T> {
  const res = await fetch(url, requestOptions);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = ((await res.json()) as Response).data as T;
  return data;
}

export async function getImageUrl(relativePath: string) {
  const myHeaders = getHeader();
  if (myHeaders === null) {
    return undefined;
  }
  const raw = JSON.stringify({
    path: path.join(env.ALIST_IMAGES_DIR, relativePath),
    password: "",
    page: 1,
    per_page: 0,
    refresh: false,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    // redirect: "follow",
  };
  try {
    const response = await fetchJson<getResponse>(
      `${env.ALIST_URL}/api/fs/get`,
      requestOptions,
    );
    return response.raw_url;
  } catch (error) {
    console.log("error", error);
  }
}

export async function list(path: string): Promise<listContent[]> {
  const myHeaders = getHeader();
  if (myHeaders === null) {
    return [];
  }

  const raw = JSON.stringify({
    path,
    password: "",
    page: 1,
    per_page: 0,
    refresh: false,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
  };

  try {
    const listResponse = await fetchJson<listResponse>(
      `${env.ALIST_URL}/api/fs/list`,
      requestOptions,
    );
    const items = listResponse.content;
    return items;
  } catch (error) {
    console.error("调用fs/list出错: ", error);
    return [];
  }
}
// 递归获取所有图片文件路径
export async function getAistImages(
  dir_path: string,
): Promise<Array<{ filename: string; path: string }>> {
  const fullPath = path.join(env.ALIST_IMAGES_DIR, dir_path);
  try {
    const items = await list(fullPath);
    let images: Array<{ filename: string; path: string }> = [];

    for (const item of items) {
      const itemRelativePath = path.join(dir_path, item.name);
      if (item.is_dir) {
        // 递归进入子文件夹
        const subImages = await getAistImages(itemRelativePath);
        images = images.concat(subImages);
      } else if (isImageFile(item.name)) {
        images.push({
          filename: item.name,
          path: itemRelativePath,
        });
      }
    }

    return images;
  } catch (error) {
    console.error("获取图片出错：", error);
    return [];
  }
}

export async function getFolderTree(dir_path = "/"): Promise<TreeNode[]> {
  const fullPath = path.join(env.ALIST_IMAGES_DIR, dir_path);
  const folders = await list(fullPath);
  const tree: TreeNode[] = await Promise.all(
    folders
      .filter((f) => f.is_dir)
      .map(async (folder) => {
        const relativePath = path.join(dir_path, folder.name);
        const children = await getFolderTree(relativePath);
        return {
          label: folder.name,
          value: `web:${relativePath}`,
          key: `web:${relativePath}`,
          isLeaf: children.length === 0,
          children: children.length > 0 ? children : undefined,
        };
      }),
  );

  return tree;
}

export async function moveAlistFile(
  src_dir: string,
  dst_dir: string,
  name: string,
): Promise<boolean> {
  const myHeaders = getHeader();
  if (myHeaders === null) {
    return false;
  }
  const raw = JSON.stringify({
    src_dir,
    dst_dir,
    names: [name],
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
  };
  // TODO: 目标文件夹判断
  try {
    const response = await fetchJson<Response>(
      `${env.ALIST_URL}/api/fs/move`,
      requestOptions,
    );
    return response.code===200;
  } catch (error) {
    console.error(`移动文件${name}出错: `, error);
    return false;
  }
}
