import type { Env } from "./types";
import { jsonResponse } from "./utils";

const encoder = new TextEncoder();

function getProvidedToken(request: Request): string {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer?.trim() || request.headers.get("X-Upload-Token")?.trim() || "";
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function requireUploadToken(request: Request, env: Env): Response | null {
  if (!env.UPLOAD_TOKEN) {
    return jsonResponse(
      { error: "UPLOAD_TOKEN is not configured; uploads are disabled." },
      { status: 503 },
    );
  }

  const providedToken = getProvidedToken(request);
  if (!providedToken || !timingSafeEqual(providedToken, env.UPLOAD_TOKEN)) {
    return jsonResponse({ error: "Invalid upload token." }, { status: 401 });
  }

  return null;
}
