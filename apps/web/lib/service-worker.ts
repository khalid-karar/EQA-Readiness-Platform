/** Register the app service worker only in production builds. */
export function shouldRegisterServiceWorker(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "production";
}
