export interface Env {
  TEMP_STORE: KVNamespace;
  WEBDAV_ACCOUNT?: string;
  WEBDAV_PASSWORD?: string;
  WECOM_WEBHOOK_URL?: string;
  WEBDAV_BASE_URL?: string;
  PUBLIC_BASE_URL?: string;
  EXPIRATION_TTL_SECONDS?: string;
  MAX_UPLOAD_BYTES?: string;
  KV_MAX_BYTES?: string;
  MAX_FILE_COUNT?: string;
}

export interface AppConfig {
  maxUploadBytes: number;
  kvMaxBytes: number;
  expirationTtlSeconds: number;
  maxFileCount: number;
  webdavBaseUrl: string;
}

export type StorageKind = "kv" | "webdav";

export interface FileRecordMetadata {
  filename: string;
  contentType: string;
  storage: StorageKind;
  size: number;
  isZip: boolean;
  createdAt: string;
  expiresAt: string;
  webdavFilename?: string;
}

export interface BufferedUpload {
  name: string;
  contentType: string;
  size: number;
  data: Uint8Array;
}
