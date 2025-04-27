// 将序号变成字符串，自动合并邻近的序号
export const transIndex = (index: number[]) => {
  if (index.length === 0) return "";
  
  // 对数组进行排序
  const sortedIndex = [...index].sort((a, b) => a - b);
  const result: string[] = [];
  
  // 确保数组不为空
  if (sortedIndex.length > 0) {
    let start: number = sortedIndex[0]!;
    let prev: number = sortedIndex[0]!;
    
    for (let i = 1; i < sortedIndex.length; i++) {
      if (sortedIndex[i] === prev + 1) {
        // 如果是连续的序号，更新prev
        prev = sortedIndex[i]!;
      } else {
        // 如果不是连续的序号，添加当前区间并开始新区间
        if (start === prev) {
          result.push(start.toString());
        } else {
          result.push(`${start}-${prev}`);
        }
        start = sortedIndex[i]!;
        prev = sortedIndex[i]!;
      }
    }
    
    // 处理最后一个区间
    if (start === prev) {
      result.push(start.toString());
    } else {
      result.push(`${start}-${prev}`);
    }
  }
  
  return result.join(",");
};
