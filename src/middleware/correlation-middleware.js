const { AsyncLocalStorage } = require("async_hooks");
const { randomUUID } = require("crypto");

const asyncLocalStorage = new AsyncLocalStorage();

function correlationMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    randomUUID();

  res.setHeader("x-correlation-id", correlationId);

  asyncLocalStorage.run(correlationId, () => {
    next();
  });
}

function getCorrelationId() {
  return asyncLocalStorage.getStore() || randomUUID();
}

function runWithCorrelationId(correlationId, callback) {
  return asyncLocalStorage.run(correlationId || randomUUID(), callback);
}

module.exports = correlationMiddleware;
module.exports.getCorrelationId = getCorrelationId;
module.exports.runWithCorrelationId = runWithCorrelationId;
