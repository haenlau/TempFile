import { zipSync } from "fflate";
import type { AppConfig, BufferedUpload, Env, FileRecordMetadata } from "./types";
import {
  buildContentDisposition,
  makeWebDavFilename,
  sanitizeZipEntryName,
  toArrayBuffer,
} from "./utils";
import { downloadFromWebDav, uploadToWebDav } from "./webdav";

interface StoreFileInput {
  fileId: string;
  filename: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array;
  isZip: boolean;
  webdavPrefix: "file" | "zip";
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

  const webdavFilename = makeWebDavFilename(input.webdavPrefix, input.fileId, input.filename);
  await uploadToWebDav(env, config, webdavFilename, input.contentType, binary);

  const metadata: FileRecordMetadata = {
    ...baseMetadata,
    storage: "webdav",
    webdavFilename,
  };

  await env.TEMP_STORE.put(input.fileId, "", {
    metadata,
    expirationTtl: config.expirationTtlSeconds,
  });

  return metadata;
}

export async function getStoredFileResponse(
  env: Env,
  config: AppConfig,
  fileId: string,
): Promise<Response> {
  const entry = await env.TEMP_STORE.getWithMetadata<FileRecordMetadata>(fileId, {
    type: "arrayBuffer",
  });

  if (!entry.metadata) {
    return new Response("File not found", { status: 404 });
  }

  const metadata = entry.metadata;
  const headers = new Headers({
    "Content-Type": metadata.contentType,
    "Content-Disposition": buildContentDisposition(metadata.filename),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  if (metadata.storage === "kv") {
    if (!entry.value) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(entry.value, { headers });
  }

  if (metadata.storage === "webdav" && metadata.webdavFilename) {
    let response: Response;
    try {
      response = await downloadFromWebDav(env, config, metadata.webdavFilename);
    } catch {
      return new Response("Storage unavailable", { status: 502 });
    }

    if (!response.ok || !response.body) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(response.body, { status: 200, headers });
  }

  return new Response("Invalid file record", { status: 500 });
}

export function normalizeUploadBuffer(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

export function zipDataToArrayBuffer(data: Uint8Array): ArrayBuffer {
  return toArrayBuffer(data);
}
