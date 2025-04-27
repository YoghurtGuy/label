import bcrypt from "bcryptjs";

// 定义 bcrypt 模块的类型
interface BcryptModule {
  hashSync(data: string, saltOrRounds: string | number): string;
  compareSync(data: string, encrypted: string): boolean;
}

// 将明文处理为 hash
export function hashPassword(password: string): string {
  return (bcrypt as BcryptModule).hashSync(password, 10);
}

// 对比明文和 hash 是否一致
export function comparePassword(password: string, hashPassword: string): boolean {
  return (bcrypt as BcryptModule).compareSync(password, hashPassword);
}