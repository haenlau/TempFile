export interface Env {
  TEMP_STORE: KVNamespace;
  R2_BUCKET?: R2Bucket;
  LARGE_STORAGE_BACKEND?: string;
  WEBDAV_ACCOUNT?: string;
  WEBDAV_PASSWORD?: string;
  WEBDAV_URL?: string;
  WECOM_WEBHOOK_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  PUBLIC_BASE_URL?: string;
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
}

export type LargeStorageBackend = "none" | "r2" | "s3" | "webdav";

export interface AppConfig {
  maxUploadBytes: number;
  directUploadMaxBytes: number;
  kvMaxBytes: number;
  webdavChunkBytes: number;
  expirationTtlSeconds: number;
  chunkedUploadSessionTtlSeconds: number;
  maxFileCount: number;
  largeStorageBackend: LargeStorageBackend;
  webdavBaseUrl?: string;
}

export type StorageKind = "kv" | "r2" | "s3" | "webdav" | "webdav-chunked";

export interface FileRecordMetadata {
  filename: string;
  contentType: string;
  storage: StorageKind;
  size: number;
  isZip: boolean;
  createdAt: string;
  expiresAt: string;
  objectKey?: string;
  objectPrefix?: string;
  chunkSize?: number;
  chunkCount?: number;
  webdavFilename?: string;
}

export interface BufferedUpload {
  name: string;
  contentType: string;
  size: number;
  data: Uint8Array;
}

export interface ChunkedUploadSession {
  uploadId: string;
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  chunkSize: number;
  chunkCount: number;
  objectPrefix: string;
  createdAt: string;
  expiresAt: string;
}
