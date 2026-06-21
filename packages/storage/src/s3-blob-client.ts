import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { BlobClient } from "./object-store";

export interface S3BlobClientConfig {
  readonly region: string;
  readonly endpoint?: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly forcePathStyle?: boolean;
}

/** S3-compatible blob client (MinIO in local dev, KSA object store in production). */
export function createS3BlobClient(config: S3BlobClientConfig): BlobClient {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? true,
  });

  return {
    async putObject(bucket: string, key: string, body: Buffer): Promise<void> {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }),
      );
    },

    async getObject(bucket: string, key: string): Promise<Buffer | null> {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        const bytes = await response.Body?.transformToByteArray();
        return bytes ? Buffer.from(bytes) : null;
      } catch {
        return null;
      }
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    },
  };
}
