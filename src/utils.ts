import type { Env } from "./types";

const FILE_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RESERVED_PATHS = new Set([
  "api",
  "assets",
  "favicon.ico",
  "robots.txt",
  "upload",
  "webdav",
]);

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function textResponse(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "text/plain; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(body, { ...init, headers });
}

export function buildContentDisposition(filename: string): string {
  const fallback = filename
    .replace(/[\r\n"]/g, "_")
    .replace(/[\u0080-\uFFFF]/g, "_")
    .trim() || "download";

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function createFileId(length = 12): string {
  let id = "";
  const bytes = new Uint8Array(length * 2);

  while (id.length < length) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= 248) continue;
      id += FILE_ID_ALPHABET[byte % FILE_ID_ALPHABET.length];
      if (id.length === length) break;
    }
  }

  return id;
}

export async function generateUniqueFileId(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = createFileId();
    const existing = await env.TEMP_STORE.get(id);
    if (!existing) return id;
  }

  return createFileId(16);
}

export function isDownloadId(id: string): boolean {
  return !RESERVED_PATHS.has(id) && /^[A-Za-z0-9]{10,32}$/.test(id);
}

export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer as ArrayBuffer;
}

export function buildDownloadUrl(request: Request, env: Env, fileId: string): string {
  const base = env.PUBLIC_BASE_URL?.trim() || new URL(request.url).origin;
  return new URL(`/${fileId}`, base.endsWith("/") ? base : `${base}/`).toString();
}

export function safeMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown error";
}

export function sanitizeZipEntryName(name: string, usedNames: Set<string>): string {
  const normalized = name
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("_")
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .trim();

  const fallback = normalized || "file";
  const dot = fallback.lastIndexOf(".");
  const base = dot > 0 ? fallback.slice(0, dot) : fallback;
  const ext = dot > 0 ? fallback.slice(dot) : "";

  let candidate = fallback;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base} (${index})${ext}`;
    index += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

export function makeWebDavFilename(prefix: "file" | "zip", fileId: string, filename: string): string {
  const safeName = filename
    .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120)
    .trim() || "upload";

  return `${prefix}_${fileId}_${safeName}`;
}
