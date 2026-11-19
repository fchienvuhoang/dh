import assert from "node:assert/strict";
import { test } from "node:test";
import { wrapImageText } from "./statement-share-image";

test("image wrapping preserves long bank references and Vietnamese memo text", () => {
  const memo = "NGUYỄN VĂN A cúng dường vật thực REF123456789012345678901234567890";
  const lines = wrapImageText(memo, text => text.length, 18);
  assert.ok(lines.every(line => line.length <= 18));
  assert.equal(lines.join("").replace(/\s/g, ""), memo.replace(/\s/g, ""));
});
