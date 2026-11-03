import { OAuth2Client } from "google-auth-library";

export function googleAuthConfigured() {
  try { getGoogleAuthConfig(); return true; } catch { return false; }
}

export function getGoogleAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const secret = process.env.AUTH_SECRET;
  if (!clientId || !clientSecret || !secret || secret.length < 32 || !process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("Google SSO chưa được cấu hình đầy đủ.");
  }
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("NEXT_PUBLIC_APP_URL chưa hợp lệ.");
  }
  const origin = url.origin;
  return { origin, clientId, clientSecret, redirectUri: `${origin}/api/auth/google/callback` };
}

export function googleClient() {
  const config = getGoogleAuthConfig();
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
}
