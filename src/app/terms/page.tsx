import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Mail, OPERATOR } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using ana.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      summary={
        <>
          ana is a private logger for your sadhana, your reflections and the moments that matter. What you keep is yours, and
          only you can open it. Keep your recovery words safe: without them and your passkey, no one can open your logger, not
          even us.
        </>
      }
    >
      <Section n={1} title="These terms">
        <p>
          These terms are an agreement between you and {OPERATOR}, in India, who runs ana (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          By signing in to ana you accept them, and our{" "}
          <Link href="/privacy" className="text-accent font-semibold underline underline-offset-2">Privacy</Link> policy. If you
          don&rsquo;t agree, please don&rsquo;t use ana.
        </p>
      </Section>

      <Section n={2} title="Who can use ana">
        <p>
          You must be 18 or over. You sign in with a Google account, and access is opened by us (or straight away with an invite).
          We may decline or end access at our discretion, for example to keep ana small while it grows.
        </p>
      </Section>

      <Section n={3} title="Your keys">
        <p>
          Your logger is encrypted with a key only you hold, opened by your passkey, your passphrase or your 12 recovery words.
          Keep your recovery words somewhere safe and private. We can&rsquo;t see them, reset them or recover your logger without
          them, so if you lose both your passkey and your recovery words, what you kept is lost for good. You&rsquo;re responsible
          for keeping your keys and your devices safe.
        </p>
      </Section>

      <Section n={4} title="What you keep is yours">
        <p>
          You own everything you put into ana. You let us store it, encrypted, and carry it between your devices, only to provide
          ana to you. Please only keep what you have the right to keep, and take care with photos, recordings and notes about
          other people.
        </p>
      </Section>

      <Section n={5} title="Using ana well">
        <p>Please don&rsquo;t:</p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>use ana for anything unlawful, or to store unlawful content;</li>
          <li>try to get into anyone else&rsquo;s account, or to break, overload or get around ana&rsquo;s security;</li>
          <li>copy, resell or reuse ana itself, its design or its code, without our permission.</li>
        </ul>
      </Section>

      <Section n={6} title="Isha content">
        <p>
          ana is made for people in the Isha community, but it is an independent app: it isn&rsquo;t made, run or endorsed by Isha
          Foundation. Quotes, practice names and other Isha material shown in ana belong to their owners and are shown only for
          your personal use.
        </p>
      </Section>

      <Section n={7} title="Not advice">
        <p>
          ana helps you keep a record. It doesn&rsquo;t teach practices or give medical, health or other professional advice. Learn
          and do your practices as taught by qualified teachers, and look after your health.
        </p>
      </Section>

      <Section n={8} title="Price">
        <p>
          ana is free to use today. If we ever ask for payment or offer a way to contribute, we&rsquo;ll tell you first and it will
          come with its own terms. Nothing you&rsquo;ve kept will be held back.
        </p>
      </Section>

      <Section n={9} title="Availability">
        <p>
          We work to keep ana running well, and it works offline on your phone, but we can&rsquo;t promise it will always be
          available or free of errors. We may change, pause or stop parts of it. If we ever stop ana altogether, we&rsquo;ll give
          you at least 30 days&rsquo; notice to download your logger. You can download it any time from Profile, Your data.
        </p>
      </Section>

      <Section n={10} title="Our responsibility">
        <p>
          ana is provided as it is. As far as the law allows, we aren&rsquo;t liable for indirect losses, or for loss of what you
          kept because of lost keys, and our total liability to you is limited to ₹1,000. Nothing here limits rights you have that
          the law doesn&rsquo;t allow to be limited.
        </p>
      </Section>

      <Section n={11} title="Ending">
        <p>
          You can stop using ana at any time, and ask us to delete your account by writing to <Mail />. We may suspend or end your
          access if you break these terms, telling you why unless the law or safety prevents it.
        </p>
      </Section>

      <Section n={12} title="Changes">
        <p>
          If we change these terms in a way that matters, we&rsquo;ll tell you in ana before the change takes effect. If you keep
          using ana after that, you accept the new terms.
        </p>
      </Section>

      <Section n={13} title="Law">
        <p>These terms are governed by the laws of India. Any dispute goes to the courts of Coimbatore, Tamil Nadu.</p>
      </Section>

      <Section n={14} title="Contact">
        <p>
          Questions about these terms: <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
