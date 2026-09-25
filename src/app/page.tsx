import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";

export default async function Home() {
  redirect(homeFor(await getCurrentUser()));
}
