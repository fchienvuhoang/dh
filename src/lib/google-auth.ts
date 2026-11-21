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

// Use Workers' native fetch and Web Crypto instead of Node HTTP/TLS transports.
import { createRemoteJWKSet, jwtVerify } from "jose";
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function exchangeGoogleCode(code: string, verifier: string) {
  const config = getGoogleAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Google token exchange HTTP ${response.status}`);
  const tokens = await response.json() as { id_token?: unknown };
  if (typeof tokens.id_token !== "string") throw new Error("Missing Google ID token");
  return tokens.id_token;
}

export async function verifyGoogleIdentity(idToken: string) {
  return (await jwtVerify(idToken, googleKeys, {
    audience: getGoogleAuthConfig().clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    algorithms: ["RS256"],
    requiredClaims: ["sub", "iat", "exp"],
  })).payload;
}
