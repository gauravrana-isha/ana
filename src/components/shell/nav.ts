import type { FeatureKey } from "@/lib/features";

/** Serializable nav item, built on the server from the user's features. */
export interface NavItem {
  key: FeatureKey | "profile" | "admin";
  label: string;
  href: string;
}

/** Reading pages opened from a list: no page header, they bring their own back and ⋯. */
export const BARE_PAGES = ["/expressions/", "/people/", "/profile/"];

export const PAGE_TITLES: Record<string, string> = {
  "/today": "Today",
  "/tracker": "Tracker",
  "/daily": "Daily reflection",
  "/weekly": "Weekly",
  "/expressions/": "Moment",
  "/expressions": "Expressions",
  "/people": "People",
  "/insights": "Insights",
  "/commitment": "My commitment",
  "/profile/who": "Who am I?",
  "/profile": "Profile",
  "/admin": "People & access",
};
