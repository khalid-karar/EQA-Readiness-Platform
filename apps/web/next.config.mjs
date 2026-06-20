/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the Next.js dev-route indicator (floating "N" bottom-left) during local
  // UI review; errors still surface via the compile/runtime overlay.
  devIndicators: false,
  // Puppeteer must run natively in the Node server — do not bundle for the edge.
  serverExternalPackages: ["puppeteer", "@puppeteer/browsers"],
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
