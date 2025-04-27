import pino from "pino";

import { env } from "@/env";


const logger = pino(
  {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    serializers: {
      req: pino.stdSerializers.req, // 标准请求序列化器
      res: pino.stdSerializers.res, // 标准响应序列化器
    },
    timestamp: () => `,"time":"${new Date().toLocaleString("zh-cn")}"`,
    base: null,
  },
  process.stdout,
);
export default logger;
