import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDatabaseSslUrl } from "./database-url";

test("deprecated SSL aliases preserve full verification and connection parameters", () => {
  for (const mode of ["prefer", "require", "verify-ca"]) {
    const original = new URL(`postgresql://test:p%40ss@db.example:5432/dhamma?sslmode=${mode}&sslrootcert=%2Fca.pem&channel_binding=require`);
    const normalized = new URL(normalizeDatabaseSslUrl(original.href)!);
    assert.equal(normalized.searchParams.get("sslmode"), "verify-full");
    assert.equal(normalized.username, original.username);
    assert.equal(normalized.password, original.password);
    assert.equal(normalized.host, original.host);
    assert.equal(normalized.pathname, original.pathname);
    assert.equal(normalized.searchParams.get("sslrootcert"), "/ca.pem");
    assert.equal(normalized.searchParams.get("channel_binding"), "require");
  }
});

test("explicit libpq compatibility, local connections and other SSL modes stay unchanged", () => {
  for (const url of [undefined, "invalid", "postgres://localhost/dhamma", "postgres://db/dhamma?sslmode=disable", "postgres://db/dhamma?sslmode=verify-full", "postgres://db/dhamma?sslmode=require&uselibpqcompat=true"]) {
    assert.equal(normalizeDatabaseSslUrl(url), url);
  }
});
