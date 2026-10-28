import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { pictureCredits } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Picture credits",
  description: "Who took the photos in ana.",
};

/** The photos above the reflection questions and moods: who took each, and under which licence. */
export default function CreditsPage() {
  const pictures = pictureCredits();
  return (
    <LegalPage
      title="Picture credits"
      summary={<>The photos in ana were found on Wikimedia Commons, shared freely by the people who took them. Thank you.</>}
    >
      <ul className="flex flex-col divide-y divide-line/70 font-ui text-[15px] leading-[1.6]">
        {pictures.map((p) => (
          <li key={p.src} className="py-3.5">
            <p className="text-ink-soft text-[13.5px]">{p.for}</p>
            <p className="text-ink">
              {p.alt}
              {p.credit ? (
                <>
                  {" "}by{" "}
                  <a href={p.credit.href} target="_blank" rel="noreferrer" className="text-accent font-semibold underline underline-offset-2">
                    {p.credit.by}
                  </a>
                  , {p.credit.licence}
                </>
              ) : (
                ", public domain"
              )}
            </p>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
