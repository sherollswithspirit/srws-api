"use strict";

/**
 * Rate limiting middleware for contact form submissions.
 * Limits submissions per IP to prevent spam.
 */

// In-memory store for rate limiting (resets on server restart)
// For multi-instance deployments, consider using Redis instead
const ipSubmissions = new Map();

// Configuration
const MAX_SUBMISSIONS = 3; // Max submissions per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour window

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipSubmissions.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      ipSubmissions.delete(ip);
    }
  }
}, 10 * 60 * 1000);

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Only apply to POST requests on contact-submissions
    if (
      ctx.method !== "POST" ||
      !ctx.path.includes("/api/contact-submissions")
    ) {
      return next();
    }

    // Get client IP (handles proxies)
    const ip =
      ctx.request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      ctx.request.headers["x-real-ip"] ||
      ctx.request.ip ||
      "unknown";

    const now = Date.now();
    const record = ipSubmissions.get(ip);

    if (record) {
      // Check if window has expired
      if (now - record.windowStart > WINDOW_MS) {
        // Reset window
        ipSubmissions.set(ip, { count: 1, windowStart: now });
      } else if (record.count >= MAX_SUBMISSIONS) {
        // Rate limit exceeded
        strapi.log.warn(`Rate limit exceeded for IP: ${ip}`);
        ctx.status = 429;
        ctx.body = {
          error: {
            status: 429,
            name: "TooManyRequests",
            message: "Too many submissions. Please try again later.",
          },
        };
        return;
      } else {
        // Increment count
        record.count++;
      }
    } else {
      // First submission from this IP
      ipSubmissions.set(ip, { count: 1, windowStart: now });
    }

    await next();
  };
};
