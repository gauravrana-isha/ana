import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { Ornament } from "@/components/art/Ornament";
import { SadhguruSignature } from "@/components/art/SadhguruSignature";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { signInWithGoogle } from "@/app/actions";
import { getCurrentUser, homeFor } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account couldn't be used. Please use one with a verified email.",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in.",
  Configuration: "Sign-in isn't set up correctly yet. Please tell an admin.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong signing in. Please try again.") : null;

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative h-[46dvh] min-h-[300px] lg:h-auto overflow-hidden bg-[#c9c5c0]">
        <Image
          src="/images/sadhguru-namaskar.jpg"
          alt="Sadhguru with hands folded in namaskar"
          fill
          priority
          quality={85}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover object-[50%_18%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 via-40% to-transparent" />
        <figure className="absolute left-6 right-6 bottom-6 lg:left-12 lg:right-12 lg:bottom-12 flex flex-wrap items-center justify-end text-right gap-x-3 lg:gap-x-4 gap-y-1 text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.35)] selection:bg-white/30 selection:text-white">
          <blockquote className="font-display italic text-[16.5px] sm:text-[19px] lg:text-[24px] leading-[1.4]">
            &ldquo;If you resist change, you resist life.&rdquo;
          </blockquote>
          <figcaption className="shrink-0">
            <SadhguruSignature className="w-[64px] sm:w-[88px] lg:w-[112px] h-auto text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]" />
          </figcaption>
        </figure>
      </div>

      <main className="relative overflow-hidden flex items-center justify-center px-6 py-10 lg:py-16">
        <Ornament name="leaves" width={420} className="absolute -right-24 -bottom-6 text-ink-soft/15 hidden sm:block" />
        <div className="w-full max-w-[380px]">
          <div className="flex items-center gap-2 text-accent">
            <Lotus size={34} />
            <span className="font-display text-[30px] font-semibold text-ink tracking-[-0.01em]">ana</span>
          </div>
          <Ornament name="flourish" width={132} className="mt-5 text-ink-soft/45" />
          <h1 className="mt-5 font-display text-[30px] lg:text-[36px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink">
            Your sadhana, and the moments worth keeping.
          </h1>
          <p className="mt-4 font-ui text-[15px] leading-[1.6] text-ink-soft">
            Log your practices, reflect each day and week, and remember the people you meet along the way.
          </p>

          <form action={signInWithGoogle} className="mt-9">
            <GoogleButton />
          </form>

          {message && (
            <p role="alert" className="mt-4 font-ui text-[13px] leading-[1.5] text-danger">
              {message}
            </p>
          )}

          <p className="mt-6 font-ui text-[13px] leading-[1.6] text-ink-soft">
            New here? Sign in, set up your journal, and an admin will welcome you in shortly after.
          </p>
        </div>
      </main>
    </div>
  );
}
