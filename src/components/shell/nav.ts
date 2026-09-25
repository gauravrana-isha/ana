import type { FeatureKey } from "@/lib/features";

/** Serializable nav item, built on the server from the user's features. */
export interface NavItem {
  key: FeatureKey | "profile" | "admin";
  label: string;
  href: string;
}

export const PAGE_TITLES: Record<string, string> = {
  "/today": "Today",
  "/tracker": "Tracker",
  "/daily": "Daily reflection",
  "/weekly": "Weekly",
  "/expressions": "Expressions",
  "/people": "People",
  "/insights": "Insights",
  "/commitment": "My commitment",
  "/profile": "Profile",
  "/admin": "People & access",
};
