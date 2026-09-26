import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Public_Sans } from "next/font/google";
import { Providers } from "./providers";
import { SplashController } from "@/components/shell/SplashController";
import { WebAnalytics } from "@/components/shell/WebAnalytics";
import "./globals.css";

/*
 * Design contract (see PRODUCT.md, DESIGN.md)
 * THESIS: a sadhana journal that feels like a calm cream notebook, not a habit app;
 *   no streaks, no scores, nothing that shouts.
 * OWN-WORLD: cream paper ground, cream cards without borders, deep Isha teal as the one
 *   accent, saffron only for moments of arrival (splash, today). Fraunces for titles and
 *   reflective text, Public Sans for the interface. Night journal is the same world, lamp off.
 * STORY: open, see today, log or reflect in seconds, look back on people and moments.
 * FIRST VIEWPORT: page title in Fraunces with today's date; content sits in one quiet column
 *   (sidebar on desktop, bottom bar on phones).
 * FORM: brief-pinned. The user named the reference app (sadhana-pwa-demo-vercel.vercel.app) as the
 *   look to adopt, so no concept roll was run (a pinned brief beats the roll). Code-led: no image generation.
 */

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://anasadh.vercel.app";
const DESCRIPTION = "A sadhana journal: practices, reflections, and the moments and people you want to keep.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "ana", template: "%s · ana" },
  description: DESCRIPTION,
  applicationName: "ana",
  manifest: "/manifest.webmanifest",
  // favicon.ico is picked up from src/app; the PNG is for browsers that prefer it.
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ana" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "ana",
    title: "ana — sadhana journal",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", secureUrl: `${APP_URL}/og.png`, type: "image/png", width: 1200, height: 630, alt: "ana — your sadhana, and the moments worth keeping" }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ana — sadhana journal",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  // A private journal: nothing here belongs in search results.
  robots: { index: false, follow: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch zoom stays available; inputs are 16px so iOS never auto-zooms.
  viewportFit: "cover",
  // The on-screen keyboard overlays the page instead of shrinking it, so fixed bars stay put.
  interactiveWidget: "resizes-visual",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#13120e" },
  ],
};

// Runs before first paint: show the splash once per browser session.
const SPLASH_SCRIPT = `try{if(!sessionStorage.getItem('ana-splash')){sessionStorage.setItem('ana-splash','1');document.documentElement.classList.add('splash')}}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("ana-theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${fraunces.variable} ${publicSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
      </head>
      <body className="font-ui antialiased min-h-dvh">
        <div className="ana-splash" aria-hidden="true" />
        <SplashController />
        <Providers>{children}</Providers>
        <WebAnalytics />
      </body>
    </html>
  );
}
