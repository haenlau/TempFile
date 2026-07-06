import type { AppConfig, Env } from "./types";

const MIB = 1024 * 1024;
const DEFAULT_WEBDAV_BASE_URL = "https://higa.teracloud.jp/dav/air1/";

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return Math.floor(parsed);
}

function normalizeDirectoryUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_WEBDAV_BASE_URL;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function getConfig(env: Env): AppConfig {
  return {
    maxUploadBytes: parsePositiveInteger(env.MAX_UPLOAD_BYTES, 99 * MIB, "MAX_UPLOAD_BYTES"),
    kvMaxBytes: parsePositiveInteger(env.KV_MAX_BYTES, 24 * MIB, "KV_MAX_BYTES"),
    expirationTtlSeconds: parsePositiveInteger(
      env.EXPIRATION_TTL_SECONDS,
      7 * 24 * 60 * 60,
      "EXPIRATION_TTL_SECONDS",
    ),
    maxFileCount: parsePositiveInteger(env.MAX_FILE_COUNT, 20, "MAX_FILE_COUNT"),
    webdavBaseUrl: normalizeDirectoryUrl(env.WEBDAV_BASE_URL ?? DEFAULT_WEBDAV_BASE_URL),
  };
}
