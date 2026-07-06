import { zipSync } from "fflate";
import { downloadUnavailableResponse } from "./download-page";
import type {
  AppConfig,
  BufferedUpload,
  ChunkedUploadSession,
  Env,
  FileRecordMetadata,
} from "./types";
import {
  buildContentDisposition,
  createFileId,
  formatBytes,
  makeChunkStorageObjectKey,
  makeStorageObjectKey,
  sanitizeZipEntryName,
  toArrayBuffer,
} from "./utils";
import { downloadFromR2, uploadToR2 } from "./r2";
import { downloadFromS3, uploadToS3 } from "./s3";
import { downloadFromWebDav, uploadToWebDav } from "./webdav";

interface StoreFileInput {
  fileId: string;
  filename: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array;
  isZip: boolean;
  objectPrefix: "file" | "zip";
}

interface CreateChunkedUploadInput {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
}

interface CompletedChunkedUpload {
  session: ChunkedUploadSession;
  metadata: FileRecordMetadata;
}

const CHUNK_UPLOAD_SESSION_PREFIX = "chunk-upload:";
const CHUNK_UPLOAD_RECEIPT_PREFIX = "chunk-upload-part:";

function getChunkUploadSessionKey(uploadId: string): string {
  return `${CHUNK_UPLOAD_SESSION_PREFIX}${uploadId}`;
}

function getChunkUploadReceiptKey(uploadId: string, index: number): string {
  return `${CHUNK_UPLOAD_RECEIPT_PREFIX}${uploadId}:${index}`;
}

async function generateChunkUploadId(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const uploadId = createFileId(24);
    const existing = await env.TEMP_STORE.get(getChunkUploadSessionKey(uploadId));
    if (existing === null) return uploadId;
  }

  return createFileId(24);
}

function isChunkedUploadSession(value: unknown): value is ChunkedUploadSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<ChunkedUploadSession>;
  return (
    typeof session.uploadId === "string" &&
    typeof session.fileId === "string" &&
    typeof session.filename === "string" &&
    typeof session.contentType === "string" &&
    typeof session.size === "number" &&
    typeof session.chunkSize === "number" &&
    typeof session.chunkCount === "number" &&
    typeof session.objectPrefix === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.expiresAt === "string"
  );
}

async function getChunkedUploadSession(
  env: Env,
  uploadId: string,
): Promise<ChunkedUploadSession | null> {
  const raw = await env.TEMP_STORE.get(getChunkUploadSessionKey(uploadId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isChunkedUploadSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getExpectedChunkSize(session: ChunkedUploadSession, index: number): number {
  if (index === session.chunkCount - 1) {
    return session.size - session.chunkSize * index;
  }

  return session.chunkSize;
}

export function zipUploads(files: BufferedUpload[]): Uint8Array {
  const usedNames = new Set<string>();
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    entries[sanitizeZipEntryName(file.name, usedNames)] = file.data;
  }

  return zipSync(entries, { level: 6 });
}

export async function storeFile(
  env: Env,
  config: AppConfig,
  input: StoreFileInput,
): Promise<FileRecordMetadata> {
  const binary = input.data instanceof Uint8Array ? toArrayBuffer(input.data) : input.data;
  const size = binary.byteLength;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + config.expirationTtlSeconds * 1000);
  const baseMetadata = {
    filename: input.filename,
    contentType: input.contentType,
    size,
    isZip: input.isZip,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (size <= config.kvMaxBytes) {
    const metadata: FileRecordMetadata = {
      ...baseMetadata,
      storage: "kv",
    };

    await env.TEMP_STORE.put(input.fileId, binary, {
      metadata,
      expirationTtl: config.expirationTtlSeconds,
    });

    return metadata;
  }

  if (config.largeStorageBackend === "none") {
    throw new Error(
      `File exceeds KV limit (${formatBytes(config.kvMaxBytes)}). Configure LARGE_STORAGE_BACKEND to enable large file storage.`,
    );
  }

  const objectKey = makeStorageObjectKey(input.objectPrefix, input.fileId, input.filename);

  if (config.largeStorageBackend === "r2") {
    await uploadToR2(env, objectKey, input.contentType, binary);
  } else if (config.largeStorageBackend === "s3") {
    await uploadToS3(env, objectKey, input.contentType, binary);
  } else {
    await uploadToWebDav(env, config, objectKey, input.contentType, binary);
  }

  const metadata: FileRecordMetadata = {
    ...baseMetadata,
    storage: config.largeStorageBackend,
    objectKey,
    webdavFilename: config.largeStorageBackend === "webdav" ? objectKey : undefined,
  };

  await env.TEMP_STORE.put(input.fileId, "", {
    metadata,
    expirationTtl: config.expirationTtlSeconds,
  });

  return metadata;
}

export async function createWebDavChunkedUpload(
  env: Env,
  config: AppConfig,
  input: CreateChunkedUploadInput,
): Promise<ChunkedUploadSession> {
  const uploadId = await generateChunkUploadId(env);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + config.expirationTtlSeconds * 1000);
  const session: ChunkedUploadSession = {
    uploadId,
    fileId: input.fileId,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    chunkSize: config.webdavChunkBytes,
    chunkCount: Math.ceil(input.size / config.webdavChunkBytes),
    objectPrefix: makeStorageObjectKey("file", input.fileId, input.filename),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await env.TEMP_STORE.put(getChunkUploadSessionKey(uploadId), JSON.stringify(session), {
    expirationTtl: config.chunkedUploadSessionTtlSeconds,
  });

  return session;
}

export async function storeWebDavUploadChunk(
  env: Env,
  config: AppConfig,
  uploadId: string,
  index: number,
  body: ArrayBuffer,
): Promise<ChunkedUploadSession> {
  const session = await getChunkedUploadSession(env, uploadId);
  if (!session) {
    throw new Error("分片上传会话不存在或已过期，请重新上传。");
  }

  if (!Number.isInteger(index) || index < 0 || index >= session.chunkCount) {
    throw new Error("分片序号无效。");
  }

  const expectedSize = getExpectedChunkSize(session, index);
  if (body.byteLength !== expectedSize) {
    throw new Error(
      `分片大小不正确，期望 ${formatBytes(expectedSize)}，实际 ${formatBytes(body.byteLength)}。`,
    );
  }

  await uploadToWebDav(
    env,
    config,
    makeChunkStorageObjectKey(session.objectPrefix, index),
    "application/octet-stream",
    body,
  );

  await env.TEMP_STORE.put(getChunkUploadReceiptKey(uploadId, index), String(body.byteLength), {
    expirationTtl: config.chunkedUploadSessionTtlSeconds,
  });

  return session;
}

export async function completeWebDavChunkedUpload(
  env: Env,
  config: AppConfig,
  uploadId: string,
): Promise<CompletedChunkedUpload> {
  const session = await getChunkedUploadSession(env, uploadId);
  if (!session) {
    throw new Error("分片上传会话不存在或已过期，请重新上传。");
  }

  const missingIndexes: number[] = [];
  for (let index = 0; index < session.chunkCount; index += 1) {
    const receipt = await env.TEMP_STORE.get(getChunkUploadReceiptKey(uploadId, index));
    if (!receipt) missingIndexes.push(index + 1);
  }

  if (missingIndexes.length) {
    throw new Error(`还有分片未上传完成：${missingIndexes.slice(0, 8).join(", ")}。`);
  }

  const metadata: FileRecordMetadata = {
    filename: session.filename,
    contentType: session.contentType,
    storage: "webdav-chunked",
    size: session.size,
    isZip: false,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    objectPrefix: session.objectPrefix,
    chunkSize: session.chunkSize,
    chunkCount: session.chunkCount,
  };

  await env.TEMP_STORE.put(session.fileId, "", {
    metadata,
    expirationTtl: config.expirationTtlSeconds,
  });

  await Promise.all([
    env.TEMP_STORE.delete(getChunkUploadSessionKey(uploadId)),
    ...Array.from({ length: session.chunkCount }, (_, index) =>
      env.TEMP_STORE.delete(getChunkUploadReceiptKey(uploadId, index)),
    ),
  ]);

  return { session, metadata };
}

function getExpectedMetadataChunkSize(metadata: FileRecordMetadata, index: number): number {
  if (!metadata.chunkSize || !metadata.chunkCount) {
    throw new Error("Invalid chunked WebDAV record.");
  }

  if (index === metadata.chunkCount - 1) {
    return metadata.size - metadata.chunkSize * index;
  }

  return metadata.chunkSize;
}

function streamWebDavChunks(
  env: Env,
  config: AppConfig,
  metadata: FileRecordMetadata,
): { readable: ReadableStream<Uint8Array>; done: Promise<void> } {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const done = (async () => {
    try {
      if (!metadata.objectPrefix || !metadata.chunkCount) {
        throw new Error("Invalid chunked WebDAV record.");
      }

      let totalBytes = 0;
      for (let index = 0; index < metadata.chunkCount; index += 1) {
        const response = await downloadFromWebDav(
          env,
          config,
          makeChunkStorageObjectKey(metadata.objectPrefix, index),
        );

        if (!response.ok || !response.body) {
          throw new Error(`WebDAV chunk download failed with HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        let chunkBytes = 0;
        try {
          while (true) {
            const { done: readDone, value } = await reader.read();
            if (readDone) break;
            if (!value) continue;

            chunkBytes += value.byteLength;
            totalBytes += value.byteLength;
            await writer.write(value);
          }
        } finally {
          reader.releaseLock();
        }

        const expectedChunkSize = getExpectedMetadataChunkSize(metadata, index);
        if (chunkBytes !== expectedChunkSize) {
          throw new Error(
            `WebDAV chunk ${index} size mismatch: expected ${expectedChunkSize}, got ${chunkBytes}.`,
          );
        }
      }

      if (totalBytes !== metadata.size) {
        throw new Error(
          `WebDAV chunked download size mismatch: expected ${metadata.size}, got ${totalBytes}.`,
        );
      }

      await writer.close();
    } catch (error) {
      console.error("Chunked WebDAV download failed:", error);
      try {
        await writer.abort(error);
      } catch {
        // The client may already have closed the connection.
      }
    }
  })();

  return { readable, done };
}

export async function getStoredFileResponse(
  env: Env,
  config: AppConfig,
  fileId: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  const entry = await env.TEMP_STORE.getWithMetadata<FileRecordMetadata>(fileId, {
    type: "arrayBuffer",
  });

  if (!entry.metadata) {
    return downloadUnavailableResponse();
  }

  const metadata = entry.metadata;
  const headers = new Headers({
    "Content-Type": metadata.contentType,
    "Content-Disposition": buildContentDisposition(metadata.filename),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  headers.set("Content-Length", String(metadata.size));

  if (metadata.storage === "kv") {
    if (!entry.value) {
      return downloadUnavailableResponse();
    }

    return new Response(entry.value, { headers });
  }

  if (metadata.storage === "r2" && metadata.objectKey) {
    let body: ReadableStream | null;
    try {
      body = await downloadFromR2(env, metadata.objectKey);
    } catch {
      return new Response("Storage unavailable", { status: 502 });
    }

    if (!body) {
      return downloadUnavailableResponse();
    }

    return new Response(body, { status: 200, headers });
  }

  if (metadata.storage === "s3" && metadata.objectKey) {
    let response: Response;
    try {
      response = await downloadFromS3(env, metadata.objectKey);
    } catch {
      return new Response("Storage unavailable", { status: 502 });
    }

    if (!response.ok || !response.body) {
      return downloadUnavailableResponse();
    }

    return new Response(response.body, { status: 200, headers });
  }

  if (metadata.storage === "webdav" && (metadata.objectKey || metadata.webdavFilename)) {
    const objectKey = metadata.objectKey || metadata.webdavFilename;
    if (!objectKey) {
      return new Response("Invalid file record", { status: 500 });
    }

    let response: Response;
    try {
      response = await downloadFromWebDav(env, config, objectKey);
    } catch {
      return new Response("Storage unavailable", { status: 502 });
    }

    if (!response.ok || !response.body) {
      return downloadUnavailableResponse();
    }

    return new Response(response.body, { status: 200, headers });
  }

  if (metadata.storage === "webdav-chunked" && metadata.objectPrefix && metadata.chunkCount) {
    headers.set("X-TempFile-Storage", "webdav-chunked");
    headers.set("X-TempFile-Chunk-Count", String(metadata.chunkCount));
    if (metadata.chunkSize) {
      headers.set("X-TempFile-Chunk-Size", String(metadata.chunkSize));
    }

    const stream = streamWebDavChunks(env, config, metadata);
    ctx?.waitUntil(stream.done);
    return new Response(stream.readable, { status: 200, headers });
  }

  return new Response("Invalid file record", { status: 500 });
}

export function normalizeUploadBuffer(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

export function zipDataToArrayBuffer(data: Uint8Array): ArrayBuffer {
  return toArrayBuffer(data);
}
