import assert from "node:assert/strict";
import test from "node:test";

import { logger, createRequestLogger, getCorrelationId, requestContext } from "../../lib/logger.js";

test("logger: logger instance exists and has standard log methods", () => {
  assert.ok(typeof logger.info === "function");
  assert.ok(typeof logger.warn === "function");
  assert.ok(typeof logger.error === "function");
  assert.ok(typeof logger.debug === "function");
  assert.ok(typeof logger.fatal === "function");
});

test("logger: createRequestLogger returns a middleware function", () => {
  const middleware = createRequestLogger();
  assert.ok(typeof middleware === "function");
  // Express middleware has arity 3: (req, res, next)
  assert.equal(middleware.length, 3);
});

test("logger: getCorrelationId returns fallback outside request scope", () => {
  const id = getCorrelationId();
  assert.equal(id, "no-correlation-id");
});

test("logger: getCorrelationId returns stored ID inside request scope", () => {
  const testId = "test-correlation-123";
  requestContext.run({ correlationId: testId }, () => {
    const id = getCorrelationId();
    assert.equal(id, testId);
  });

  // Outside the run scope, should return fallback
  const outsideId = getCorrelationId();
  assert.equal(outsideId, "no-correlation-id");
});

test("logger: nested AsyncLocalStorage scopes work correctly", () => {
  const outerCid = "outer-cid";
  const innerCid = "inner-cid";

  requestContext.run({ correlationId: outerCid }, () => {
    assert.equal(getCorrelationId(), outerCid);

    requestContext.run({ correlationId: innerCid }, () => {
      assert.equal(getCorrelationId(), innerCid);
    });

    // After inner run completes, outer is restored
    assert.equal(getCorrelationId(), outerCid);
  });
});
