import type { Env } from "./types";

function requireR2Bucket(env: Env): R2Bucket {
  if (!env.R2_BUCKET) {
    throw new Error("R2_BUCKET binding is required when LARGE_STORAGE_BACKEND=r2.");
  }

  return env.R2_BUCKET;
}

export async function uploadToR2(
  env: Env,
  key: string,
  contentType: string,
  body: ArrayBuffer,
): Promise<void> {
  await requireR2Bucket(env).put(key, body, {
    httpMetadata: {
      contentType,
    },
  });
}

export async function downloadFromR2(env: Env, key: string): Promise<ReadableStream | null> {
  const object = await requireR2Bucket(env).get(key);
  return object?.body ?? null;
}
