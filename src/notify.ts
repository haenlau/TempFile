import type { Env, FileRecordMetadata } from "./types";
import { formatBytes } from "./utils";

interface NotifyInput {
  filename: string;
  size: number;
  downloadUrl: string;
  metadata: FileRecordMetadata;
}

export async function sendWeComNotification(env: Env, input: NotifyInput): Promise<void> {
  if (!env.WECOM_WEBHOOK_URL) return;

  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const expiresAt = new Date(input.metadata.expiresAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });

  const content = [
    "Air1 TempFile: 新文件上传",
    `文件名: ${input.filename}`,
    `大小: ${formatBytes(input.size)}`,
    `存储: ${input.metadata.storage === "kv" ? "KV" : "WebDAV"}`,
    `时间: ${now}`,
    `过期: ${expiresAt}`,
    `下载地址: ${input.downloadUrl}`,
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
