import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";
import { GET as start } from "@/app/api/auth/google/route";
import { GET as callback } from "@/app/api/auth/google/callback/route";
import { safeRedirectPath, verifyAdminSessionToken } from "./auth";
import { GOOGLE_FLOW_COOKIE, readGoogleToken, signGoogleToken } from "./google-session";

process.env.AUTH_SECRET = "test-secret-with-at-least-32-characters-only";
process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.GOOGLE_ALLOWED_EMAILS = "fchienvuhoang@gmail.com";

test("Google sessions reject tampering, expiration, wrong audience, and unauthorized email", async () => {
  const identity = { provider: "google", sub: "google-user-123", email: "fchienvuhoang@gmail.com" };
  const token = await signGoogleToken(identity, "admin", 60);
  assert.equal(await verifyAdminSessionToken(token), true);
  assert.equal(await verifyAdminSessionToken(token + "invalid"), false);
  assert.equal(await verifyAdminSessionToken(await signGoogleToken(identity, "admin", -1)), false);
  assert.equal(await verifyAdminSessionToken(await signGoogleToken(identity, "google-flow", 60)), false);
  assert.equal(await verifyAdminSessionToken(await signGoogleToken({ ...identity, email: "other@gmail.com" }, "admin", 60)), false);
  process.env.GOOGLE_ALLOWED_EMAILS = "";
  assert.equal(await verifyAdminSessionToken(token), false);
  process.env.GOOGLE_ALLOWED_EMAILS = identity.email;
});

test("OAuth start sets signed expiring state, nonce, and PKCE; invalid state never authenticates", async () => {
  const response = await start(new Request("http://localhost:3000/api/auth/google?next=%2Fbao-cao"));
  const authorization = new URL(response.headers.get("location")!);
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  assert.ok(authorization.searchParams.get("code_challenge"));
  assert.equal(authorization.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/google/callback");
  const cookie = response.cookies.get(GOOGLE_FLOW_COOKIE)!.value;
  const flow = await readGoogleToken(cookie, "google-flow");
  assert.equal(flow.state, authorization.searchParams.get("state"));
  assert.equal(flow.nonce, authorization.searchParams.get("nonce"));
  assert.equal(flow.next, "/bao-cao");
  const result = await callback(new NextRequest("http://localhost:3000/api/auth/google/callback?code=test&state=wrong", { headers: { cookie: `${GOOGLE_FLOW_COOKIE}=${cookie}` } }));
  assert.equal(new URL(result.headers.get("location")!).searchParams.get("error"), "google_failed");
  assert.equal(result.cookies.get("dhamma_admin_session"), undefined);
  assert.equal(result.cookies.get(GOOGLE_FLOW_COOKIE)?.value, "");
});

test("login redirect rejects external origins and backslashes", () => {
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/\n/example.com"]) assert.equal(safeRedirectPath(path), "/");
  assert.equal(safeRedirectPath("/?tab=transactions"), "/?tab=transactions");
});


test("callback grants only the allowed verified identity with matching nonce", async () => {
  const flow = { state: "state", nonce: "nonce", verifier: "verifier", next: "/" };
  const cookie = await signGoogleToken(flow, "google-flow", 60);
  let email = "fchienvuhoang@gmail.com";
  let nonce = flow.nonce;
  let verified = true;
  const exchange = mock.method(OAuth2Client.prototype, "getToken", async () => ({ tokens: { id_token: "test-id-token" } }));
  const verification = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => ({ sub: "google-123", email, email_verified: verified, nonce }) }));
  const request = () => new NextRequest("http://localhost:3000/api/auth/google/callback?code=code&state=state", { headers: { cookie: `${GOOGLE_FLOW_COOKIE}=${cookie}` } });
  try {
    const accepted = await callback(request());
    const session = accepted.cookies.get("dhamma_admin_session")!.value;
    assert.equal(await verifyAdminSessionToken(session), true);
    email = "other@gmail.com";
    const denied = await callback(request());
    assert.equal(denied.cookies.get("dhamma_admin_session"), undefined);
    assert.match(denied.headers.get("location")!, /google_access_denied/);
    email = "fchienvuhoang@gmail.com";
    nonce = "wrong-nonce";
    assert.equal((await callback(request())).cookies.get("dhamma_admin_session"), undefined);
    nonce = flow.nonce;
    verified = false;
    assert.equal((await callback(request())).cookies.get("dhamma_admin_session"), undefined);
  } finally {
    exchange.mock.restore(); verification.mock.restore();
  }
});


test("legacy password sessions are rejected even when ADMIN_PASSWORD is still set", async () => {
  process.env.ADMIN_PASSWORD = "legacy-test-password";
  const legacyToken = createHmac("sha256", process.env.ADMIN_PASSWORD).update("dhamma-admin-session-v1").digest("hex");
  assert.equal(await verifyAdminSessionToken(legacyToken), false);
  assert.equal(await verifyAdminSessionToken(undefined), false);
  delete process.env.ADMIN_PASSWORD;
});
