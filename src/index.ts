import { getConfig } from "./config";
import { HTML } from "./html";
import { sendNotifications } from "./notify";
import {
  getStoredFileResponse,
  normalizeUploadBuffer,
  storeFile,
  zipDataToArrayBuffer,
  zipUploads,
} from "./storage";
import type { BufferedUpload, Env } from "./types";
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function handleUpload(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse({ error: "Uploads must use multipart/form-data." }, { status: 400 });
  }

  const config = getConfig(env);
  const formData = await request.formData();
  const files = (formData.getAll("file") as unknown[]).filter(isUploadFile);
  const validationError = validateFiles(files, config.maxUploadBytes, config.maxFileCount);
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
    if (zipData.byteLength > config.maxUploadBytes) {
      return jsonResponse(
        { error: `ZIP archive exceeds ${formatBytes(config.maxUploadBytes)}.` },
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

  ctx.waitUntil(
    sendNotifications(env, {
      filename,
      size,
      downloadUrl,
      metadata,
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

      if (request.method === "POST" && UPLOAD_PATHS.has(url.pathname)) {
        return handleUpload(request, env, ctx);
      }

      if (request.method === "GET") {
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length === 1 && isDownloadId(segments[0])) {
          return getStoredFileResponse(env, getConfig(env), segments[0]);
        }
      }

      return textResponse("Not Found", { status: 404 });
    } catch (error) {
      console.error("Request failed:", error);
      return jsonResponse({ error: safeMessage(error) }, { status: 500 });
    }
  },
};
