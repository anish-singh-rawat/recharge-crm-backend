/**
 * Wraps an async Express route handler to catch errors and forward to next().
 * Eliminates try/catch boilerplate in every controller.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Sleep for a given number of milliseconds.
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a promise with a timeout.
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @param {string} errorMessage
 * @returns {Promise}
 */
export const withTimeout = (promise, timeoutMs, errorMessage = 'Operation timed out') => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
  );
  return Promise.race([promise, timeout]);
};

/**
 * Retry a function with exponential backoff.
 * @param {Function} fn  Async function to retry
 * @param {object} options
 * @param {number} options.maxAttempts
 * @param {number} options.initialDelayMs
 * @param {number} options.backoffMultiplier
 * @param {number} options.maxDelayMs
 * @param {Function} options.onRetry  Called on each retry with (error, attempt)
 * @returns {Promise}
 */
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
