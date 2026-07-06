import type { Env, FileRecordMetadata } from "./types";
import { formatBytes } from "./utils";

interface NotifyInput {
  filename: string;
  size: number;
  downloadUrl: string;
  metadata: FileRecordMetadata;
}

function getStorageLabel(metadata: FileRecordMetadata): string {
  if (metadata.storage === "kv") return "KV";
  if (metadata.storage === "r2") return "R2";
  if (metadata.storage === "s3") return "S3";
  return "WebDAV";
}

export async function sendWeComNotification(env: Env, input: NotifyInput): Promise<void> {
  if (!env.WECOM_WEBHOOK_URL) return;

  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const expiresAt = new Date(input.metadata.expiresAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });

  const content = [
    "Air1 TempFile: new file uploaded",
    `File: ${input.filename}`,
    `Size: ${formatBytes(input.size)}`,
    `Storage: ${getStorageLabel(input.metadata)}`,
    `Time: ${now}`,
    `Expires: ${expiresAt}`,
    `Download: ${input.downloadUrl}`,
  ].join("\n");

  const response = await fetch(env.WECOM_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msgtype: "text",
      text: { content },
    }),
  });

  let result: { errcode?: number; errmsg?: string } = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`WeCom webhook failed with HTTP ${response.status}`);
    }
  }

  if (!response.ok || result.errcode !== 0) {
    throw new Error(result.errmsg || `WeCom webhook failed with HTTP ${response.status}`);
  }
}
