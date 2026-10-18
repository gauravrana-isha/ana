import { createSerwistRoute } from "@serwist/turbopack";

/*
 * Serves the service worker (/serwist/sw.js), built from src/app/sw.ts with the list of
 * files to keep on the device for offline use. A new deploy is a new list.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  // Everything in public/ is kept for offline use except what's never shown inside the app:
  // the iPhone launch screens (the phone fetches its own), the link preview, the full-size
  // logo files (the app uses the small ones).
  globIgnores: ["public/splash/launch-*", "public/og.png", "public/brand/*.png"],
});
