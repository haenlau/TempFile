import type { Env, FileRecordMetadata } from "./types";
import { formatBytes, safeMessage } from "./utils";

interface NotifyInput {
  filename: string;
  size: number;
  downloadUrl: string;
  metadata: FileRecordMetadata;
}

interface NotifyJob {
  name: string;
  run: () => Promise<void>;
}

function getStorageLabel(metadata: FileRecordMetadata): string {
  if (metadata.storage === "kv") return "KV";
  if (metadata.storage === "r2") return "R2";
  if (metadata.storage === "s3") return "S3";
  return "WebDAV";
}

function buildNotificationText(input: NotifyInput): string {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const expiresAt = new Date(input.metadata.expiresAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });

  return [
    "Air1 TempFile: new file uploaded",
    `File: ${input.filename}`,
    `Size: ${formatBytes(input.size)}`,
    `Storage: ${getStorageLabel(input.metadata)}`,
    `Time: ${now}`,
    `Expires: ${expiresAt}`,
    `Download: ${input.downloadUrl}`,
  ].join("\n");
}

async function sendWeComNotification(env: Env, text: string): Promise<void> {
  if (!env.WECOM_WEBHOOK_URL) return;

  const response = await fetch(env.WECOM_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      msgtype: "text",
      text: { content: text },
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

function getTelegramConfig(env: Env): { token: string; chatId: string } | null {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();

  if (!token && !chatId) return null;
  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured together.");
  }

  return { token, chatId };
}

async function sendTelegramNotification(env: Env, text: string): Promise<void> {
  const config = getTelegramConfig(env);
  if (!config) return;

  const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  let result: { ok?: boolean; description?: string } = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Telegram bot failed with HTTP ${response.status}`);
    }
  }

  if (!response.ok || result.ok !== true) {
    throw new Error(result.description || `Telegram bot failed with HTTP ${response.status}`);
  }
}

export async function sendNotifications(env: Env, input: NotifyInput): Promise<void> {
  const text = buildNotificationText(input);
  const jobs: NotifyJob[] = [];

  if (env.WECOM_WEBHOOK_URL) {
    jobs.push({ name: "WeCom", run: () => sendWeComNotification(env, text) });
  }

  if (env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_CHAT_ID) {
    jobs.push({ name: "Telegram", run: () => sendTelegramNotification(env, text) });
  }

  if (!jobs.length) return;

  const results = await Promise.allSettled(jobs.map((job) => job.run()));
  const errors = results
    .map((result, index) =>
      result.status === "rejected" ? `${jobs[index].name}: ${safeMessage(result.reason)}` : null,
    )
    .filter((message): message is string => Boolean(message));

  if (errors.length) {
    throw new Error(errors.join("; "));
  }
}
