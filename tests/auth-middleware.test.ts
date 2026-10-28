import assert from "node:assert/strict";
import test from "node:test";
import {
  isProtectedRoute,
  withTimeout,
} from "../lib/auth-middleware.ts";

test("company routes are protected only when team workspaces are enabled", () => {
  for (const path of ["/", "/staff", "/cycles", "/reports", "/team"]) {
    assert.equal(isProtectedRoute(path, true), true);
    assert.equal(isProtectedRoute(path, false), false);
  }
});

test("login and other public routes remain available", () => {
  for (const path of ["/login", "/reset-password", "/auth/callback", "/api/health"]) {
    assert.equal(isProtectedRoute(path, true), false);
  }
});

test("authentication calls are bounded by a timeout", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10),
    /Authentication service timed out/,
  );
  assert.equal(await withTimeout(Promise.resolve("ok"), 100), "ok");
});
