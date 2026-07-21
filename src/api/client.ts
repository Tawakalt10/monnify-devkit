import { loadConfig, type Config } from "../config.js";

/** Sandbox only — hard-coded on purpose. This tool refuses to touch production. */
export const BASE_URL = "https://sandbox.monnify.com";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

export async function authenticate(config?: Config): Promise<string> {
  const cfg = config ?? loadConfig();
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.accessToken;
  }
  const basic = Buffer.from(`${cfg.apiKey}:${cfg.secretKey}`).toString("base64");
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    throw new Error(
      `Authentication failed (HTTP ${res.status}). Check your sandbox API key and secret.`
    );
  }
  const body = (await res.json()) as {
    requestSuccessful: boolean;
    responseBody: { accessToken: string; expiresIn: number };
  };
  if (!body.requestSuccessful) throw new Error("Authentication rejected by Monnify.");
  tokenCache = {
    accessToken: body.responseBody.accessToken,
    expiresAt: Date.now() + body.responseBody.expiresIn * 1000,
  };
  return tokenCache.accessToken;
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await authenticate();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as {
    requestSuccessful: boolean;
    responseMessage?: string;
    responseBody: T;
  };
  if (!res.ok || !body.requestSuccessful) {
    throw new Error(`GET ${path} failed: ${body.responseMessage ?? `HTTP ${res.status}`}`);
  }
  return body.responseBody;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const token = await authenticate();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as {
    requestSuccessful: boolean;
    responseMessage?: string;
    responseBody: T;
  };
  if (!res.ok || !body.requestSuccessful) {
    throw new Error(`POST ${path} failed: ${body.responseMessage ?? `HTTP ${res.status}`}`);
  }
  return body.responseBody;
}
