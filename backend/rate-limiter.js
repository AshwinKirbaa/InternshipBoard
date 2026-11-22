export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 5,
  now = () => Date.now(),
} = {}) {
  const hits = new Map();

  function cleanup(currentTime) {
    for (const [ip, entry] of hits.entries()) {
      if (currentTime >= entry.resetTime) {
        hits.delete(ip);
      }
    }
  }

  return function rateLimiterMiddleware(request, response, next) {
    const currentTime = now();
    cleanup(currentTime);

    const clientIp = request.ip || request.socket?.remoteAddress || 'unknown';
    let entry = hits.get(clientIp);

    if (!entry || currentTime >= entry.resetTime) {
      entry = { count: 0, resetTime: currentTime + windowMs };
      hits.set(clientIp, entry);
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - currentTime) / 1000));
      response.set('Retry-After', String(retryAfterSeconds));
      return response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many applications submitted from this IP. Please try again later.',
        },
      });
    }

    entry.count += 1;
    return next();
  };
}
