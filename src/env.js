import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    IS_ON_VERCEL: z.boolean(),
    INVITE_CODE: z.string().optional(),
    SERVER_IMAGES_DIR: z.string().default("/"),
    SERVER_IMAGES_TRASH_DIR: z.string().default("/trash"),
    ALIST_TOKEN: z.string().optional(),
    ALIST_URL: z.string().url().optional(),
    ALIST_IMAGES_DIR: z.string().default("/"),
    ALIST_IMAGES_TRASH_DIR: z.string().default("/trash"),
    BUCKET_NAME: z.string().optional(),
    AWS_REGION: z.string().default("auto"),
    AWS_ENDPOINT:z.string().url().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_IMAGES_TRASH_DIR: z.string().default("trash"),
    AWS_IMAGES_DIR: z.string().optional(),
    AWS_URL:z.string().url().optional(),
    GEMINI_API_KEY: z.string().optional(),
    DOUBAO_API_KEY: z.string().optional(),
    DOUBAO_MODEL_NAME: z.string().optional(),
    DOUBAO_IS_THINKING: z.boolean().default(true),
    PROMPT: z.string().optional()
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_REFRESH_OCR_ENABLED: z.boolean().default(true),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    IS_ON_VERCEL: process.env.VERCEL === "1",
    INVITE_CODE: process.env.INVITE_CODE,
    SERVER_IMAGES_DIR: process.env.SERVER_IMAGES_DIR,
    SERVER_IMAGES_TRASH_DIR: process.env.SERVER_IMAGES_TRASH_DIR,
    ALIST_URL: process.env.ALIST_URL,
    ALIST_TOKEN: process.env.ALIST_TOKEN,
    ALIST_IMAGES_DIR: process.env.ALIST_IMAGES_DIR,
    ALIST_IMAGES_TRASH_DIR: process.env.ALIST_IMAGES_TRASH_DIR,
    BUCKET_NAME: process.env.BUCKET_NAME,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ENDPOINT:process.env.AWS_ENDPOINT,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_IMAGES_TRASH_DIR: process.env.AWS_IMAGES_TRASH_DIR,
    AWS_URL:process.env.AWS_URL,
    AWS_IMAGES_DIR:process.env.AWS_IMAGES_DIR,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DOUBAO_API_KEY: process.env.DOUBAO_API_KEY,
    DOUBAO_MODEL_NAME: process.env.DOUBAO_MODEL_NAME,
    DOUBAO_IS_THINKING: process.env.DOUBAO_IS_THINKING,
    PROMPT: process.env.PROMPT,
    NEXT_PUBLIC_REFRESH_OCR_ENABLED: process.env.NEXT_PUBLIC_REFRESH_OCR_ENABLED!=="false"
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
