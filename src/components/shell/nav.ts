import type { FeatureKey } from "@/lib/features";

/** Serializable nav item, built on the server from the user's features. */
export interface NavItem {
  key: FeatureKey | "profile" | "admin";
  label: string;
  href: string;
}

/** Reading pages opened from a list: no page header, they bring their own back and ⋯. */
export const BARE_PAGES = ["/expressions/", "/presence/", "/profile/"];

export const PAGE_TITLES: Record<string, string> = {
  "/home": "Home",
  "/sadhana": "Sadhana",
  "/daily": "Daily reflection",
  "/weekly": "Weekly",
  "/expressions/": "Moment",
  "/expressions": "Expressions",
  "/presence": "Presence",
  "/insights": "Insights",
  "/sankalpa": "Sankalpa",
  "/profile/who": "Who am I?",
  "/profile": "Profile",
  "/admin": "People & access",
};
