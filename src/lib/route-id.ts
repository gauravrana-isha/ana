"use client";

import { use } from "react";
import { usePathname } from "next/navigation";

/**
 * The id in a detail page's address (/moments/[id], /presence/[id]), read from the address
 * itself. Offline, the phone may show a saved copy of another moment's page as the template for
 * this one (any moment, even one made offline, opens that way), so the address is what counts.
 */
export function useRouteId(params: Promise<{ id: string }>) {
  const { id } = use(params);
  const fromPath = usePathname()?.split("/")[2];
  return fromPath && fromPath !== "~" ? decodeURIComponent(fromPath) : id;
}
