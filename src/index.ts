import { getConfig } from "./config";
import { HTML } from "./html";
import { sendNotifications } from "./notify";
import {
  completeWebDavChunkedUpload,
  createWebDavChunkedUpload,
  getStoredFileResponse,
  normalizeUploadBuffer,
  storeFile,
  storeWebDavUploadChunk,
  zipDataToArrayBuffer,
  zipUploads,
} from "./storage";
import type { AppConfig, BufferedUpload, Env } from "./types";
import {
  buildDownloadUrl,
  formatBytes,
  generateUniqueFileId,
  isDownloadId,
  jsonResponse,
  safeMessage,
  textResponse,
} from "./utils";

const UPLOAD_PATHS = new Set(["/api/upload", "/api/upload-public"]);
const CHUNK_UPLOAD_INIT_PATH = "/api/upload/chunk/init";
const CHUNK_UPLOAD_COMPLETE_PATH = "/api/upload/chunk/complete";
const MULTIPART_OVERHEAD_ALLOWANCE_BYTES = 1024 * 1024;

function htmlResponse(): Response {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}

function optionsResponse(request: Request): Response {
  const origin = request.headers.get("Origin");
  const currentOrigin = new URL(request.url).origin;
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  });

  if (!origin || origin === currentOrigin) {
    headers.set("Access-Control-Allow-Origin", origin || currentOrigin);
  }

  return new Response(null, { status: 204, headers });
}

function validateFiles(files: File[], maxUploadBytes: number, maxFileCount: number): Response | null {
  if (!files.length) {
    return jsonResponse({ error: "No valid files were provided." }, { status: 400 });
  }

  if (files.length > maxFileCount) {
    return jsonResponse({ error: `Too many files. Maximum is ${maxFileCount}.` }, { status: 400 });
  }

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;
    if (file.size > maxUploadBytes) {
      return jsonResponse(
        { error: `File "${file.name}" exceeds ${formatBytes(maxUploadBytes)}.` },
        { status: 400 },
      );
    }
  }

  if (totalSize > maxUploadBytes) {
    return jsonResponse(
      { error: `Total upload size exceeds ${formatBytes(maxUploadBytes)}.` },
      { status: 400 },
    );
  }

  return null;
}

function isUploadFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "arrayBuffer" in value
  );
}

function getUploaderIp(request: Request): string {
  const cfConnectingIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const trueClientIp = request.headers.get("True-Client-IP")?.trim();
  if (trueClientIp) return trueClientIp;

  const forwardedFor = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  return forwardedFor || "unknown";
}

function getContentLength(request: Request): number | null {
  const value = request.headers.get("Content-Length");
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getChunkUploadRoute(pathname: string): { uploadId: string; index: number } | null {
  const match = pathname.match(/^\/api\/upload\/chunk\/([0-9a-z]{10,32})\/(\d+)$/);
  if (!match) return null;

  const index = Number(match[2]);
  if (!Number.isInteger(index) || index < 0) return null;

  return { uploadId: match[1], index };
}

function getWebDavChunkingConfigError(env: Env, config: AppConfig): string | null {
  if (config.largeStorageBackend !== "webdav") {
    return "超过 99MB 的分片上传需要设置 LARGE_STORAGE_BACKEND=webdav。";
  }

  if (!config.webdavBaseUrl || !env.WEBDAV_ACCOUNT || !env.WEBDAV_PASSWORD) {
    return "WebDAV 分片上传需要配置 WEBDAV_URL、WEBDAV_ACCOUNT 和 WEBDAV_PASSWORD。";
  }

  return null;
}

function getJsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getPayloadString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function getPayloadNumber(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  return typeof value === "number" ? value : Number(value);
}

async function handleUpload(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse({ error: "Uploads must use multipart/form-data." }, { status: 400 });
  }

  const config = getConfig(env);
  const contentLength = getContentLength(request);
  if (
    contentLength !== null &&
    contentLength > config.directUploadMaxBytes + MULTIPART_OVERHEAD_ALLOWANCE_BYTES
  ) {
    return jsonResponse(
      {
        error: `普通上传不能超过 ${formatBytes(config.directUploadMaxBytes)}，单文件大于该限制时请使用 WebDAV 分片上传。`,
      },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      { error: "上传内容无法解析，可能超过平台限制或不是有效的表单数据。" },
      { status: 413 },
    );
  }
  const files = (formData.getAll("file") as unknown[]).filter(isUploadFile);
  const validationError = validateFiles(files, config.directUploadMaxBytes, config.maxFileCount);
  if (validationError) return validationError;

  const fileId = await generateUniqueFileId(env);
  let filename: string;
  let size: number;
  let contentTypeForStorage: string;
  let data: ArrayBuffer | Uint8Array;
  let isZip = false;

  if (files.length === 1) {
    const file = files[0];
    filename = file.name || "upload";
    size = file.size;
    contentTypeForStorage = file.type || "application/octet-stream";
    data = await file.arrayBuffer();
  } else {
    const bufferedFiles: BufferedUpload[] = [];
    for (const file of files) {
      bufferedFiles.push({
        name: file.name || "file",
        contentType: file.type || "application/octet-stream",
        size: file.size,
        data: normalizeUploadBuffer(await file.arrayBuffer()),
      });
    }

    const zipData = zipUploads(bufferedFiles);
    if (zipData.byteLength > config.directUploadMaxBytes) {
      return jsonResponse(
        { error: `ZIP archive exceeds ${formatBytes(config.directUploadMaxBytes)}.` },
        { status: 400 },
      );
    }

    filename = `upload_${fileId}.zip`;
    size = zipData.byteLength;
    contentTypeForStorage = "application/zip";
    data = zipDataToArrayBuffer(zipData);
    isZip = true;
  }

  const metadata = await storeFile(env, config, {
    fileId,
    filename,
    contentType: contentTypeForStorage,
    data,
    isZip,
    objectPrefix: isZip ? "zip" : "file",
  });

  const downloadUrl = buildDownloadUrl(request, env, fileId);
  const uploaderIp = getUploaderIp(request);

  ctx.waitUntil(
    sendNotifications(env, {
      filename,
      size,
      downloadUrl,
      metadata,
      uploaderIp,
    }).catch((error) => {
      console.error("Notification failed:", error);
    }),
  );

  return jsonResponse({
    downloadUrl,
    fileId,
    filename,
    size,
    storage: metadata.storage,
    expiresAt: metadata.expiresAt,
  });
}

async function handleChunkUploadInit(request: Request, env: Env): Promise<Response> {
  const config = getConfig(env);
  const configError = getWebDavChunkingConfigError(env, config);
  if (configError) {
    return jsonResponse({ error: configError }, { status: 400 });
  }

  let payload: Record<string, unknown> | null;
  try {
    payload = getJsonObject(await request.json());
  } catch {
    payload = null;
  }

  if (!payload) {
    return jsonResponse({ error: "请求格式不正确。" }, { status: 400 });
  }

  const filename = getPayloadString(payload, "filename").slice(0, 255) || "upload";
  const contentType =
    getPayloadString(payload, "contentType").slice(0, 200) || "application/octet-stream";
  const size = getPayloadNumber(payload, "size");

  if (!Number.isFinite(size) || !Number.isInteger(size) || size <= 0) {
    return jsonResponse({ error: "文件大小无效。" }, { status: 400 });
  }

  if (size > config.maxUploadBytes) {
    return jsonResponse(
      { error: `文件不能超过 ${formatBytes(config.maxUploadBytes)}。` },
      { status: 413 },
    );
  }

  const fileId = await generateUniqueFileId(env);
  const session = await createWebDavChunkedUpload(env, config, {
    fileId,
    filename,
    contentType,
    size,
  });

  return jsonResponse({
    uploadId: session.uploadId,
    fileId: session.fileId,
    filename: session.filename,
    size: session.size,
    chunkSize: session.chunkSize,
    chunkCount: session.chunkCount,
    expiresAt: session.expiresAt,
  });
}

async function handleChunkUploadPart(
  request: Request,
  env: Env,
  uploadId: string,
  index: number,
): Promise<Response> {
  const config = getConfig(env);
  const configError = getWebDavChunkingConfigError(env, config);
  if (configError) {
    return jsonResponse({ error: configError }, { status: 400 });
  }

  const contentLength = getContentLength(request);
  if (contentLength !== null && contentLength > config.webdavChunkBytes) {
    return jsonResponse(
      { error: `单个分片不能超过 ${formatBytes(config.webdavChunkBytes)}。` },
      { status: 413 },
    );
  }

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    return jsonResponse({ error: "分片内容无法读取。" }, { status: 413 });
  }

  try {
    const session = await storeWebDavUploadChunk(env, config, uploadId, index, body);
    return jsonResponse({ ok: true, index, chunkCount: session.chunkCount });
  } catch (error) {
    const message = safeMessage(error);
    const status = message.includes("WebDAV upload failed") ? 502 : 400;
    return jsonResponse({ error: message }, { status });
  }
}

async function handleChunkUploadComplete(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const config = getConfig(env);
  const configError = getWebDavChunkingConfigError(env, config);
  if (configError) {
    return jsonResponse({ error: configError }, { status: 400 });
  }

  let payload: Record<string, unknown> | null;
  try {
    payload = getJsonObject(await request.json());
  } catch {
    payload = null;
  }

  if (!payload) {
    return jsonResponse({ error: "请求格式不正确。" }, { status: 400 });
  }

  const uploadId = getPayloadString(payload, "uploadId");
  if (!/^[0-9a-z]{10,32}$/.test(uploadId)) {
    return jsonResponse({ error: "分片上传会话无效。" }, { status: 400 });
  }

  let completed;
  try {
    completed = await completeWebDavChunkedUpload(env, config, uploadId);
  } catch (error) {
    return jsonResponse({ error: safeMessage(error) }, { status: 400 });
  }

  const { session, metadata } = completed;
  const downloadUrl = buildDownloadUrl(request, env, session.fileId);
  const uploaderIp = getUploaderIp(request);

  ctx.waitUntil(
    sendNotifications(env, {
      filename: session.filename,
      size: session.size,
      downloadUrl,
      metadata,
      uploaderIp,
    }).catch((error) => {
      console.error("Notification failed:", error);
    }),
  );

  return jsonResponse({
    downloadUrl,
    fileId: session.fileId,
    filename: session.filename,
    size: session.size,
    storage: metadata.storage,
    expiresAt: metadata.expiresAt,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return optionsResponse(request);
      }

      if (request.method === "GET" && url.pathname === "/") {
        return htmlResponse();
      }

      if (request.method === "GET" && url.pathname === "/robots.txt") {
        return textResponse("User-agent: *\nDisallow: /\n");
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return jsonResponse({ ok: true, service: "air1-tempfile" });
      }

      if (request.method === "POST" && url.pathname === CHUNK_UPLOAD_INIT_PATH) {
        return handleChunkUploadInit(request, env);
      }

      if (request.method === "PUT") {
        const route = getChunkUploadRoute(url.pathname);
        if (route) {
          return handleChunkUploadPart(request, env, route.uploadId, route.index);
        }
      }

      if (request.method === "POST" && url.pathname === CHUNK_UPLOAD_COMPLETE_PATH) {
        return handleChunkUploadComplete(request, env, ctx);
      }

      if (request.method === "POST" && UPLOAD_PATHS.has(url.pathname)) {
        return handleUpload(request, env, ctx);
      }

      if (request.method === "GET") {
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length === 1 && isDownloadId(segments[0])) {
          return getStoredFileResponse(env, getConfig(env), segments[0], ctx);
        }
      }

      return textResponse("Not Found", { status: 404 });
    } catch (error) {
      console.error("Request failed:", error);
      return jsonResponse({ error: safeMessage(error) }, { status: 500 });
    }
  },
};
