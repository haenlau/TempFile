import { AwsClient } from "aws4fetch";
import type { Env } from "./types";

interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function requireS3Config(env: Env): S3Config {
  const endpoint = env.S3_ENDPOINT?.trim().replace(/\/+$/, "");
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when LARGE_STORAGE_BACKEND=s3.",
    );
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: env.S3_REGION?.trim() || "auto",
  };
}

function createS3Client(config: S3Config): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: config.region,
  });
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function buildS3Url(config: S3Config, key: string): string {
  return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeObjectKey(key)}`;
}

export async function uploadToS3(
  env: Env,
  key: string,
  contentType: string,
  body: ArrayBuffer,
): Promise<void> {
  const config = requireS3Config(env);
  const response = await createS3Client(config).fetch(buildS3Url(config, key), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed with HTTP ${response.status}`);
  }
}

export async function downloadFromS3(env: Env, key: string): Promise<Response> {
  const config = requireS3Config(env);
  return createS3Client(config).fetch(buildS3Url(config, key));
}
