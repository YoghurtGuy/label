import 'server-only';
import fs from 'fs';
import path from 'path';

// import logger from './logger';

// const fileSystemLogger = logger.child({ name: "FILE_SYSTEM" });
// 定义树节点类型
export interface TreeNode {
  label: string;
  value: string;
  key: string;
  isLeaf: boolean;
  children?: TreeNode[];
}

/**
 * 获取文件夹树形结构
 * @param dirPath 目录路径
 * @param maxDepth 最大深度，默认为3
 * @returns 树形结构数组
 */
export const getDirectoryTree = (dirPath: string, maxDepth = 3): TreeNode[] => {
  try {
    // 检查路径是否存在
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    // 读取目录内容
    const items = fs.readdirSync(dirPath);
    
    // 过滤并排序项目
    const filteredItems = items
      .filter(item => {
        // 排除隐藏文件和系统文件
        return !item.startsWith('.') && 
               !['node_modules', 'dist', 'build'].includes(item) &&
               fs.statSync(path.join(dirPath, item)).isDirectory();
      })

    // 构建树形结构
    return filteredItems.map(item => {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // 如果是目录，递归获取子目录
        return {
          label: item,
          value: fullPath,
          key: fullPath,
          isLeaf: false,
          children: maxDepth > 0 ? getDirectoryTree(fullPath, maxDepth - 1) : [],
        };
      } else {
        // 如果是文件，只返回文件信息
        return {
          label: item,
          value: fullPath,
          key: fullPath,
          isLeaf: true,
        };
      }
    });
  } catch (error) {
    // fileSystemLogger.error('获取目录树失败:', error);
    console.error('获取目录树失败:', error);
    return [];
  }
}; 