import { verifyGoogleAdminSession } from "@/lib/google-session";

export const ADMIN_SESSION_COOKIE = "dhamma_admin_session";
export const READONLY_SESSION_COOKIE = "dhamma_readonly_session";

const READONLY_SESSION_MESSAGE = "dhamma-readonly-session-v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const READONLY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export function isReadonlyViewConfigured() {
  return Boolean(
    process.env.READONLY_VIEW_PASSWORD && process.env.READONLY_VIEW_PASSWORD.length >= 8,
  );
}

export function getReadonlySessionMaxAge() {
  return READONLY_SESSION_MAX_AGE_SECONDS;
}

export function verifyReadonlyPassword(password: string) {
  const expectedPassword = process.env.READONLY_VIEW_PASSWORD;
  return Boolean(expectedPassword && constantTimeEqual(password, expectedPassword));
}

export async function createReadonlySessionToken() {
  const password = process.env.READONLY_VIEW_PASSWORD;
  if (!password) {
    throw new Error("Readonly view is not configured.");
  }

  return hmacHex(password, READONLY_SESSION_MESSAGE);
}

export async function verifyReadonlySessionToken(token: string | undefined) {
  if (!token || !isReadonlyViewConfigured()) {
    return false;
  }

  return constantTimeEqual(token, await createReadonlySessionToken());
}

export async function verifyAdminSessionToken(token: string | undefined) {
  return token ? verifyGoogleAdminSession(token) : false;
}

export function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return "/";
  }

  if (value.startsWith("/dang-nhap")) {
    return "/";
  }

  return value;
}

async function hmacHex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}
