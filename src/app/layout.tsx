import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Fraunces, Public_Sans } from "next/font/google";
import { Providers } from "./providers";
import { SplashController } from "@/components/shell/SplashController";
import { WebAnalytics } from "@/components/shell/WebAnalytics";
import { LAUNCH_SCREENS } from "@/lib/launch-screens";
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
  // No optical-size axis: it made the font files about 60% larger for a barely visible change.
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
const DESCRIPTION = "A logger for your sadhana, your reflections and the moments that matter. Only you can open it.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "ana", template: "%s · ana" },
  description: DESCRIPTION,
  applicationName: "ana",
  manifest: "/manifest.webmanifest",
  // favicon.ico (16/32/48) is picked up from src/app. Tabs get the flat mark, in a lighter teal
  // when the browser is dark; home screens get the glossy mark on cream.
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-16.png", type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-dark-32.png", type: "image/png", sizes: "32x32", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/favicon-dark-16.png", type: "image/png", sizes: "16x16", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120" },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ana", startupImage: LAUNCH_SCREENS },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "ana",
    title: "ana · a logger for your sadhana",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", secureUrl: `${APP_URL}/og.png`, type: "image/png", width: 1200, height: 630, alt: "ana — your sadhana, and the moments worth keeping" }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ana · a logger for your sadhana",
    description: DESCRIPTION,
    images: [{ url: "/og.png", alt: "ana — your sadhana, and the moments worth keeping" }],
  },
  // A private journal: nothing here belongs in search results.
  robots: { index: false, follow: false },
  other: { "mobile-web-app-capable": "yes", "msapplication-TileColor": "#fbf8f2", "msapplication-TileImage": "/icons/icon-144.png" },
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
/*
 * iPhone home-screen app: the page draws under the status bar, and some iOS versions report
 * its height (safe-area-inset-top) as 0, so the top of the app sat under the clock. When that
 * happens, use the status bar's real height (by screen size) instead. Runs before first paint.
 */
const SAFE_TOP_SCRIPT = `try{(function(){var n=navigator,d=document.documentElement;function fix(){var H=Math.max(screen.width,screen.height);if(!(/iPhone|iPod/.test(n.userAgent)&&(n.standalone||matchMedia('(display-mode: standalone)').matches)))return;if(!matchMedia('(orientation: portrait)').matches||innerHeight<H-2){d.style.removeProperty('--safe-top-fix');return}var p=document.createElement('div');p.style.cssText='position:fixed;top:0;visibility:hidden;padding-top:env(safe-area-inset-top)';d.appendChild(p);var e=parseFloat(getComputedStyle(p).paddingTop)||0;p.remove();if(e<1)d.style.setProperty('--safe-top-fix',(H>=852?60:H>=812?50:20)+'px');else d.style.removeProperty('--safe-top-fix')}fix();addEventListener('load',fix);addEventListener('resize',fix);addEventListener('pageshow',fix)})()}catch(x){}`;

/*
 * The theme from this device's own setting, before first paint. A page opened offline is a
 * saved copy, made with whatever theme was on when it was saved; this keeps the current one.
 */
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )ana-theme=(dark|light)/);if(m)document.documentElement.setAttribute('data-theme',m[1])}catch(e){}`;

// The opening coil belongs to the app, not the landing page (shown at / to visitors).
const SPLASH_SCRIPT = `try{if(location.pathname!=='/'&&!sessionStorage.getItem('ana-splash')){sessionStorage.setItem('ana-splash','1');document.documentElement.classList.add('splash')}}catch(e){}`;

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
        {/* Written into the page's head on the server, so it runs before the first paint. */}
        <Script id="ana-safe-top" strategy="beforeInteractive">
          {SAFE_TOP_SCRIPT}
        </Script>
        <Script id="ana-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <Script id="ana-splash" strategy="beforeInteractive">
          {SPLASH_SCRIPT}
        </Script>
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
