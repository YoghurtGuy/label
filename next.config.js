/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { env } from "./src/env.js";

const remotePatterns = [];

if (env.ALIST_URL) {
  remotePatterns.push(new URL(`${env.ALIST_URL}/d/**`));
}
if (env.AWS_URL) {
  remotePatterns.push(new URL(`${env.AWS_URL}/**`));
}

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@ant-design/pro-components', 'antd', '@ant-design/icons'],
  output: "standalone",
  images:{
    remotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
};

export default config;
