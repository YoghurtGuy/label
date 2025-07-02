export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}
export function distributeImagesToUsers(
  images: string[],
  userIds: string[],
): Record<string, string[]> {
  if (userIds.length === 0) throw new Error("User ID list cannot be empty");

  const shuffled = shuffleArray(images);
  const result = new Map<string, string[]>();

  // 初始化每个用户的图像数组
  userIds.forEach(id => {
    result.set(id, []);
  });

  shuffled.forEach((img, index) => {
    const userId = userIds[index % userIds.length]!;
    result.get(userId)?.push(img);
  });

  return Object.fromEntries(result);
}

function isStringArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every(item => typeof item === "string");
}

function isResponseObjArray(arr: unknown): arr is { response: string; score: number; according: string }[] {
  return Array.isArray(arr) && arr.every(
    item =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as {response:string}).response === "string" &&
      typeof (item as {score:number}).score === "number" &&
      typeof (item as {according:string}).according === "string"
  );
}
export function isValidJsonText(text: string): boolean {
  try {
    const parsed :unknown= JSON.parse(text);
    return isStringArray(parsed) || isResponseObjArray(parsed);
  } catch {
    return false;
  }
}