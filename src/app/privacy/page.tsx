import type { Metadata } from "next";
import { LegalPage, Section, Mail, OPERATOR } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ana keeps, what it can't read, and your choices.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      summary={<>What you keep in ana is encrypted on your device. We store it, but no one can read it, not even us.</>}
    >
      <Section n={1} title="Who we are">
        <p>
          ana is run by {OPERATOR}, in India, the data fiduciary under the Digital Personal Data Protection Act, 2023. Write to{" "}
          <Mail />.
        </p>
      </Section>

      <Section n={2} title="What we keep">
        <p>
          Your name, email and picture from Google. Dates, sizes and types of what you keep, but never its content. For birthdays,
          only the day and month, so a reminder can reach you. Technical error reports, deleted after 30 days.
        </p>
        <p>We don&rsquo;t sell anything, show ads or train AI on your data.</p>
      </Section>

      <Section n={3} title="Cookies">
        <p>
          Only what ana needs: signing in, light or dark, the sidebar, and your answer to the cookies question. With your yes,
          Vercel Web Analytics also counts visits, anonymously. Change your answer from &ldquo;Cookies&rdquo; below.
        </p>
      </Section>

      <Section n={4} title="Who helps run ana">
        <p>
          Google (sign-in), Vercel (hosting and database, Singapore), Cloudflare (encrypted files) and your browser&rsquo;s
          notification service.
        </p>
      </Section>

      <Section n={5} title="Your rights">
        <p>
          Download your logger from Profile any time. Write to <Mail />{" "}
          to see, correct or delete your data; we delete within 30 days. If you&rsquo;re not satisfied, you can complain to the Data Protection Board of India. ana is for people 18 and
          over.
        </p>
      </Section>
    </LegalPage>
  );
}
