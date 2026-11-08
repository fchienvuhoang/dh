import assert from "node:assert/strict";
import { test } from "node:test";
import { isTransientDatabaseError, withDatabaseReadRetry } from "./prisma";
import { apiError } from "./api";

test("recognizes pg pool acquisition timeouts including nested Prisma causes", async () => {
  const error = new Error("timeout exceeded when trying to connect");
  assert.equal(isTransientDatabaseError(error), true);
  assert.equal(isTransientDatabaseError(new Error("Database adapter failed", { cause: error })), true);
  const response = apiError(error);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "3");
  assert.match((await response.json()).error, /database/);
});

test("safe database reads recover from a transient acquisition failure", async () => {
  let attempts = 0;
  const result = await withDatabaseReadRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("timeout exceeded when trying to connect");
    return "result";
  });
  assert.equal(result, "result");
  assert.equal(attempts, 3);
});

test("permission and data errors are never retried", async () => {
  let attempts = 0;
  await assert.rejects(withDatabaseReadRetry(async () => {
    attempts++;
    throw new Error("permission denied for table bank_transactions");
  }), /permission denied/);
  assert.equal(attempts, 1);
});
