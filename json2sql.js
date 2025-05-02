import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// 初始化Prisma客户端
const prisma = new PrismaClient();

/**
 * 解析JSON行文件，提取output和imageUrl数据
 * @param {string} filePath - JSON行文件的路径
 * @returns {Array<{output: string, imageUrl: string}>} 包含output和imageUrl的数组
 */
export const parseJsonLineFile = (filePath) => {
  try {
    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // 按行分割
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // 解析每行JSON并提取所需字段
    const results = lines.map(line => {
      try {
        const data = JSON.parse(line);
        // 处理 output 字符串，删除最前面的 ```markdown\n 和最后面的 \n```
        let processedOutput = data.output || '';
        if (processedOutput.startsWith('```markdown\n')) {
          processedOutput = processedOutput.substring('```markdown\n'.length);
        }
        if (processedOutput.endsWith('\n```')) {
          processedOutput = processedOutput.substring(0, processedOutput.length - '\n```'.length);
        }
        
        return {
          output: processedOutput,
          imageUrl: data.imageurl || '',
        };
      } catch (error) {
        console.error('解析JSON行失败:', error);
        return {
          output: '',
          imageUrl: '',
        };
      }
    });

    return results;
  } catch (error) {
    console.error('读取文件失败:', error);
    return [];
  }
};

/**
 * 将解析后的数据写入新文件
 * @param {Array<{output: string, imageUrl: string}>} data - 要写入的数据
 * @param {string} outputPath - 输出文件路径
 */
export const writeParsedData = (data, outputPath) => {
  try {
    const outputContent = data
      .map(item => JSON.stringify(item))
      .join('\n');
    
    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`数据已成功写入: ${outputPath}`);
  } catch (error) {
    console.error('写入文件失败:', error);
  }
};

/**
 * 根据imageUrl查找图片并创建标注
 * @param {string} imageUrl - 图片URL
 * @param {string} text - 标注文本内容
 * @param {string} [userId] - 创建标注的用户ID（可选）
 * @param {string} [taskId] - 标注任务ID（可选）
 * @returns {Promise<Object|null>} 创建的标注对象或null
 */
export const createAnnotationFromImageUrl = async (imageUrl, text, userId, taskId) => {
  try {
    // 根据imageUrl查找图片
    const image = await prisma.image.findFirst({
      where: {
        path: {
          contains: imageUrl
        }
      }
    });

    if (!image) {
      console.error(`未找到匹配的图片: ${imageUrl}`);
      return null;
    }

    // 创建标注
    const annotation = await prisma.annotation.create({
      data: {
        type: 'OCR',
        text: text,
        status: 'PENDING',
        imageId: image.id,
        createdById: userId || undefined,
      }
    });

    console.log(`成功创建标注: ${annotation.id}`);
    return annotation;
  } catch (error) {
    console.error('创建标注失败:', error);
    return null;
  }
};

/**
 * 批量处理JSON行文件，为每行数据创建标注
 * @param {string} filePath - JSON行文件的路径
 * @param {string} [userId] - 创建标注的用户ID（可选）
 * @param {string} [taskId] - 标注任务ID（可选）
 * @returns {Promise<Array<Object>>} 创建的标注对象数组
 */
export const processJsonLineFileAndCreateAnnotations = async (filePath, userId, taskId) => {
  try {
    // 解析JSON行文件
    const data = parseJsonLineFile(filePath);
    
    // 批量创建标注
    const annotations = [];
    for (const item of data) {
      if (item.imageUrl && item.output) {
        const annotation = await createAnnotationFromImageUrl(
          item.imageUrl,
          item.output,
          userId,
          taskId
        );
        if (annotation) {
          annotations.push(annotation);
        }
      }
    }
    
    console.log(`成功处理 ${annotations.length} 条数据`);
    return annotations;
  } catch (error) {
    console.error('批量处理失败:', error);
    return [];
  }
};

// 使用示例
const filePath = 'img/merged.jsonl';
// 解析JSON行文件
processJsonLineFileAndCreateAnnotations(filePath, undefined,undefined);

// 批量处理并创建标注（取消注释以执行）
// processJsonLineFileAndCreateAnnotations(filePath)
//   .then(annotations => console.log(`创建了 ${annotations.length} 个标注`))
//   .catch(error => console.error('处理失败:', error))
//   .finally(() => prisma.$disconnect());
