/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace packages ship as TypeScript source and are compiled by the
  // app. List them here as they begin to be consumed by feature code.
  transpilePackages: [
    "@eqa/db",
    "@eqa/auth",
    "@eqa/audit-log",
    "@eqa/tenant",
    "@eqa/storage",
    "@eqa/ai",
    "@eqa/content",
    "@eqa/workflows",
    "@eqa/jobs",
    "@eqa/crypto",
  ],
};

export default nextConfig;
