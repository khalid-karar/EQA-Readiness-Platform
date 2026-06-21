import { connect, type Socket } from "node:net";
import { StorageError } from "./errors";
import type { MalwareScanner, MalwareScanResult } from "./types";

export interface ClamavScannerConfig {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs?: number;
}

/**
 * Malware scanner backed by ClamAV clamd (INSTREAM over TCP). Used with the
 * clamav service in docker-compose.dev.yml.
 */
export class ClamavScanner implements MalwareScanner {
  constructor(private readonly config: ClamavScannerConfig) {}

  scan(bytes: Buffer): Promise<MalwareScanResult> {
    const timeoutMs = this.config.timeoutMs ?? 30_000;

    return new Promise((resolve, reject) => {
      const socket: Socket = connect({
        host: this.config.host,
        port: this.config.port,
      });

      let response = "";
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new StorageError("ClamAV scan timed out."));
      }, timeoutMs);

      socket.on("data", (chunk: Buffer) => {
        response += chunk.toString("utf8");
      });

      socket.on("error", (error: Error) => {
        clearTimeout(timer);
        reject(new StorageError(`ClamAV connection failed: ${error.message}`));
      });

      socket.on("close", () => {
        clearTimeout(timer);
        const trimmed = response.trim();
        const infected = /FOUND\s*$/m.test(trimmed);
        const signature = infected
          ? trimmed.split(":").pop()?.replace(/\s+FOUND\s*$/, "").trim()
          : undefined;
        resolve({
          clean: !infected,
          scanner: "clamav",
          ...(signature ? { signature } : {}),
        });
      });

      socket.write(Buffer.from("zINSTREAM\0"));
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, offset + chunkSize);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
      socket.end();
    });
  }
}

export function createClamavScannerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ClamavScanner {
  return new ClamavScanner({
    host: env.CLAMAV_HOST ?? "127.0.0.1",
    port: Number(env.CLAMAV_PORT ?? "3310"),
  });
}
