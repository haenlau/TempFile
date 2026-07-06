import type { AppConfig, Env, LargeStorageBackend } from "./types";

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

const MAX_UPLOAD_BYTES = 2 * GIB;
const DIRECT_UPLOAD_MAX_BYTES = 99 * MIB;
const KV_MAX_BYTES = 24 * MIB;
const WEBDAV_CHUNK_BYTES = 48 * MIB;
const EXPIRATION_TTL_SECONDS = 7 * 24 * 60 * 60;
const CHUNKED_UPLOAD_SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_FILE_COUNT = 20;

function normalizeDirectoryUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function parseLargeStorageBackend(value: string | undefined): LargeStorageBackend {
  const normalized = value?.trim().toLowerCase() || "none";

  if (
    normalized === "none" ||
    normalized === "r2" ||
    normalized === "s3" ||
    normalized === "webdav"
  ) {
    return normalized;
  }

  throw new Error("LARGE_STORAGE_BACKEND must be one of: none, r2, s3, webdav.");
}

export function getConfig(env: Env): AppConfig {
  return {
    maxUploadBytes: MAX_UPLOAD_BYTES,
    directUploadMaxBytes: DIRECT_UPLOAD_MAX_BYTES,
    kvMaxBytes: KV_MAX_BYTES,
    webdavChunkBytes: WEBDAV_CHUNK_BYTES,
    expirationTtlSeconds: EXPIRATION_TTL_SECONDS,
    chunkedUploadSessionTtlSeconds: CHUNKED_UPLOAD_SESSION_TTL_SECONDS,
    maxFileCount: MAX_FILE_COUNT,
    largeStorageBackend: parseLargeStorageBackend(env.LARGE_STORAGE_BACKEND),
    webdavBaseUrl: normalizeDirectoryUrl(env.WEBDAV_URL),
  };
}
