import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function monorepoRoot(): string {
  const candidates = [join(process.cwd(), "..", ".."), process.cwd()];
  for (const root of candidates) {
    if (existsSync(join(root, "tools", "render-evidence-pack-sample.ts"))) {
      return root;
    }
  }
  throw new Error(
    "Cannot locate tools/render-evidence-pack-sample.ts from the web app working directory.",
  );
}

function tsxCliPath(root: string): string {
  const cli = join(root, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(cli)) {
    throw new Error(
      `tsx CLI not found at ${cli}. Run pnpm install from the monorepo root.`,
    );
  }
  return cli;
}

/**
 * Renders a sample evidence pack PDF in a child process. Puppeteer cannot run
 * reliably inside the Next.js webpack server bundle; the subprocess uses the
 * same path as `pnpm generate:sample-pack`.
 */
export async function renderEvidencePackSamplePdf(
  locale: "en" | "ar",
): Promise<Buffer> {
  const root = monorepoRoot();
  const script = join(root, "tools", "render-evidence-pack-sample.ts");
  const tsx = tsxCliPath(root);

  const { stdout } = await execFileAsync(
    process.execPath,
    [tsx, script, locale],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    },
  );

  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}
