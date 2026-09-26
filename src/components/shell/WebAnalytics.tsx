"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Page-view counts (Vercel Web Analytics: no cookies, no personal data). Addresses are
 * reported without their internal ids or query strings, so a person's page is just
 * "/people/[id]" and nothing typed or opened is ever part of what's sent.
 */
function scrub(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  const path = url.pathname.replace(/^\/people\/[^/]+/, "/people/[id]");
  return { ...event, url: `${url.origin}${path}` };
}

export function WebAnalytics() {
  return <Analytics beforeSend={scrub} />;
}
