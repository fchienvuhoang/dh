import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionMaxAge, safeRedirectPath } from "@/lib/auth";
import { getGoogleAuthConfig, googleClient } from "@/lib/google-auth";
import { GOOGLE_FLOW_COOKIE, isAllowedGoogleEmail, readGoogleToken, signGoogleToken } from "@/lib/google-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let origin: string;
  try { origin = getGoogleAuthConfig().origin; } catch {
    return NextResponse.json({ error: "Google SSO chưa được cấu hình đầy đủ." }, { status: 503 });
  }
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  try {
    const token = request.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    if (!token || !code || !state || request.nextUrl.searchParams.has("error")) throw new Error("Invalid callback");
    const flow = await readGoogleToken(token, "google-flow");
    if (flow.state !== state || typeof flow.verifier !== "string" || typeof flow.nonce !== "string") throw new Error("Invalid state");
    const client = googleClient();
    const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier });
    if (!tokens.id_token) throw new Error("Missing ID token");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: getGoogleAuthConfig().clientId });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email_verified || (identity as unknown as { nonce?: string }).nonce !== flow.nonce) throw new Error("Invalid identity");
    if (!isAllowedGoogleEmail(identity.email)) return finish("/dang-nhap?error=google_access_denied");
    const response = finish(safeRedirectPath(flow.next));
    response.cookies.set(ADMIN_SESSION_COOKIE, await signGoogleToken({ provider: "google", sub: identity.sub, email: identity.email.toLowerCase() }, "admin", getAdminSessionMaxAge()), {
      httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: getAdminSessionMaxAge(),
    });
    return response;
  } catch {
    return finish("/dang-nhap?error=google_failed");
  }
}
