import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/auth";
import { getGoogleAuthConfig, googleClient } from "@/lib/google-auth";
import { GOOGLE_FLOW_COOKIE, signGoogleToken } from "@/lib/google-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const config = getGoogleAuthConfig();
    const currentUrl = new URL(request.url);
    if (currentUrl.origin !== config.origin) {
      return NextResponse.redirect(new URL(`/api/auth/google${currentUrl.search}`, config.origin));
    }
    const client = googleClient();
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const next = safeRedirectPath(new URL(request.url).searchParams.get("next"));
    const response = NextResponse.redirect(client.generateAuthUrl({
      scope: ["openid", "email"], state, nonce,
      code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256,
      prompt: "select_account",
    }));
    response.cookies.set(GOOGLE_FLOW_COOKIE, await signGoogleToken({ state, nonce, verifier: codeVerifier, next }, "google-flow", 600), {
      httpOnly: true, secure: config.origin.startsWith("https:"), sameSite: "lax", path: "/api/auth/google", maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Google SSO chưa sẵn sàng. Kiểm tra GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET (tối thiểu 32 ký tự) và NEXT_PUBLIC_APP_URL." }, { status: 503 });
  }
}
