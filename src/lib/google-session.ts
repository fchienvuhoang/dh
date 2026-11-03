import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const GOOGLE_FLOW_COOKIE = "dhamma_google_flow";
const issuer = "dhamma";

export function isAllowedGoogleEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const allowed = (process.env.GOOGLE_ALLOWED_EMAILS ?? "fchienvuhoang@gmail.com")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET cần có ít nhất 32 ký tự.");
  return new TextEncoder().encode(secret);
}

export async function signGoogleToken(payload: JWTPayload, audience: "admin" | "google-flow", maxAge: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(`${maxAge}s`)
    .sign(secretKey());
}

export async function readGoogleToken(token: string, audience: "admin" | "google-flow") {
  return (await jwtVerify(token, secretKey(), { issuer, audience, algorithms: ["HS256"], requiredClaims: ["exp", "iat"] })).payload;
}

export async function verifyGoogleAdminSession(token: string) {
  try {
    const payload = await readGoogleToken(token, "admin");
    return payload.provider === "google" && typeof payload.sub === "string" && Boolean(payload.sub) && isAllowedGoogleEmail(payload.email);
  } catch {
    return false;
  }
}
