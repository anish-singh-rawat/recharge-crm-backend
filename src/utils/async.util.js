export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withTimeout = (promise, timeoutMs, errorMessage = 'Operation timed out') => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
  );
  return Promise.race([promise, timeout]);
};

export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    onRetry = null,
  } = options;

  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs,
        );
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        const actualDelay = Math.round(delay + jitter);

        if (onRetry) onRetry(err, attempt + 1);
        await sleep(actualDelay);
      }
    }
  }
  throw lastError;
};
