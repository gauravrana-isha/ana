import type { Metadata } from "next";
import { LegalPage, Section, Mail, OPERATOR } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using ana.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      summary={<>By signing in, you agree to these terms and our Privacy policy.</>}
    >
      <Section n={1} title="Using ana">
        <p>
          ana is run by {OPERATOR}, in India. It&rsquo;s for people 18 and over, and free today. Please don&rsquo;t misuse it or
          store anything unlawful. We may end access that breaks these terms.
        </p>
      </Section>

      <Section n={2} title="Your keys, your content">
        <p>
          What you keep is yours, and only you can open it. If you lose your passkey and your recovery words, it can&rsquo;t be
          recovered, not even by us.
        </p>
      </Section>

      <Section n={3} title="Isha">
        <p>
          ana is independent, not made or endorsed by Isha Foundation. It keeps a record; it doesn&rsquo;t teach practices or give
          health advice.
        </p>
      </Section>

      <Section n={4} title="Liability">
        <p>
          ana is provided as it is. As far as the law allows, our liability is limited to ₹1,000. If ana ever stops, you&rsquo;ll
          get 30 days&rsquo; notice to download your logger.
        </p>
      </Section>

      <Section n={5} title="Law and contact">
        <p>
          Indian law applies, and disputes go to the courts of Coimbatore, Tamil Nadu. Questions: <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
