import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera and microphone are for recording moments; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets a second dev server (e.g. against a test database) run with its own build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // 85 is used for the large Sadhguru photo; everything else stays at the default 75.
    qualities: [75, 85],
  },
  experimental: {
    // Reuse pages already visited for a few minutes instead of asking the server again on
    // every tap (screens fetch their own data; this is just the page shell).
    staleTimes: { dynamic: 300, static: 600 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Serwist builds the service worker (see src/app/serwist/[path]/route.ts).
export default withSerwist(nextConfig);
