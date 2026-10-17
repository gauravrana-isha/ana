import type { Metadata } from "next";
import { NotFound } from "@/components/shell/NotFound";

export const metadata: Metadata = { title: "Not found" };

export default function NotFoundPage() {
  return <NotFound fullScreen />;
}
