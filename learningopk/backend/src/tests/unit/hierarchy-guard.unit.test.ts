import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";

test("hierarchy guard keeps authorization deterministic", async (t) => {
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    DATABASE_URL: "postgresql://test:test@localhost:5433/test",
    REDIS_URL: "redis://localhost:6379",
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:3001",
    FRONTEND_ORIGIN: "http://localhost:3000",
    MINIO_ACCESS_KEY: "test-only-access",
    MINIO_SECRET_KEY: "test-only-secret",
    TYPESAFE_API_KEY: "test-only-key",
    DOTENV_KEY: "",
  };
  t.after(() => {
    process.env = originalEnv;
  });
  t.mock.method(dotenv, "configDotenv", () => ({ parsed: {} }));
  const { checkPermissionWithHierarchy } = await import("../../lib/erp/hierarchy-guard.js");

  await t.test(
    "missing membership denies without inference even with a configured key",
    async (t) => {
      const fetchMock = t.mock.method(globalThis, "fetch", async () => {
        throw new Error("inference must not be called");
      });
      assert.deepEqual(
        await checkPermissionWithHierarchy("test-user", 1, new Set(["ERP_ACCESS"]), "ROLES_VIEW"),
        { granted: false, strategy: "deterministic" }
      );
      assert.equal(fetchMock.mock.callCount(), 0);
    }
  );

  await t.test("membership allows without a configured key", async (t) => {
    process.env.TYPESAFE_API_KEY = "";
    t.after(() => {
      process.env.TYPESAFE_API_KEY = "test-only-key";
    });
    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
      throw new Error("inference must not be called");
    });
    assert.deepEqual(
      await checkPermissionWithHierarchy("test-user", 1, new Set(["ROLES_VIEW"]), "ROLES_VIEW"),
      { granted: true, strategy: "deterministic" }
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  await t.test("unavailable inference preserves membership", async (t) => {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => {
      throw new Error("inference unavailable");
    });
    assert.deepEqual(
      await checkPermissionWithHierarchy("test-user", 1, new Set(["ROLES_VIEW"]), "ROLES_VIEW"),
      { granted: true, strategy: "deterministic" }
    );
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  await t.test(
    "advisory traversal cannot revoke membership when it selects another module",
    async (t) => {
      const fetchMock = t.mock.method(globalThis, "fetch", async () =>
        Response.json({
          answers: Object.fromEntries(
            ["q0", "q1", "q2", "leaf"].map((key) => [
              key,
              {
                type: "choice",
                probabilities: key === "leaf" ? { EMPLOYEES_VIEW: 1 } : { HRM: 1 },
              },
            ])
          ),
        })
      );
      const result = await checkPermissionWithHierarchy(
        "test-user",
        1,
        new Set(["ROLES_VIEW"]),
        "ROLES_VIEW"
      );
      assert.equal(result.granted, true);
      assert.equal(result.strategy, "hierarchical");
      assert.deepEqual(result.path, ["ERP_ACCESS", "HRM", "ROLES_VIEW"]);
      assert.ok(fetchMock.mock.callCount() > 0);
    }
  );
});
