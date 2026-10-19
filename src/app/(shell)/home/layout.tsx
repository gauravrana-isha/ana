import { requireAppUser } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAppUser("today");
  return children;
}
