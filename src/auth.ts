import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

/** Emails that become approved admins on first sign-in (comma separated). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Only accept Google accounts whose email Google has verified.
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      return profile?.email_verified === true;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email && user.id && adminEmails().includes(user.email.toLowerCase())) {
        await db.user.update({
          where: { id: user.id },
          data: { role: "ADMIN", status: "APPROVED", approvedAt: new Date() },
        });
      }
    },
  },
});
