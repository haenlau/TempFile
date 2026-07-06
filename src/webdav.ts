import type { AppConfig, Env } from "./types";

function requireWebDavCredentials(env: Env): { account: string; password: string } {
  if (!env.WEBDAV_ACCOUNT || !env.WEBDAV_PASSWORD) {
    throw new Error("WEBDAV_ACCOUNT and WEBDAV_PASSWORD must be configured for WebDAV storage.");
  }

  return {
    account: env.WEBDAV_ACCOUNT,
    password: env.WEBDAV_PASSWORD,
  };
}

function getAuthorizationHeader(env: Env): string {
  const { account, password } = requireWebDavCredentials(env);
  return `Basic ${btoa(`${account}:${password}`)}`;
}

function requireWebDavBaseUrl(config: AppConfig): string {
  if (!config.webdavBaseUrl) {
    throw new Error("WEBDAV_URL must be configured when LARGE_STORAGE_BACKEND=webdav.");
  }

  return config.webdavBaseUrl;
}

export function buildWebDavUrl(config: AppConfig, filename: string): string {
  return `${requireWebDavBaseUrl(config)}${encodeURIComponent(filename)}`;
}

export async function uploadToWebDav(
  env: Env,
  config: AppConfig,
  filename: string,
  contentType: string,
  body: BodyInit,
): Promise<void> {
  const response = await fetch(buildWebDavUrl(config, filename), {
    method: "PUT",
    headers: {
      Authorization: getAuthorizationHeader(env),
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`WebDAV upload failed with HTTP ${response.status}`);
  }
}

export async function downloadFromWebDav(
  env: Env,
  config: AppConfig,
  filename: string,
): Promise<Response> {
  return fetch(buildWebDavUrl(config, filename), {
    headers: {
      Authorization: getAuthorizationHeader(env),
    },
  });
}

export async function deleteFromWebDav(env: Env, config: AppConfig, filename: string): Promise<void> {
  const response = await fetch(buildWebDavUrl(config, filename), {
    method: "DELETE",
    headers: {
      Authorization: getAuthorizationHeader(env),
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`WebDAV delete failed with HTTP ${response.status}`);
  }
}
