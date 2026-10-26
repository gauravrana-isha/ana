import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Mail, OPERATOR } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ana keeps, what it can't read, and your choices.",
};

const COOKIES = [
  { name: "Sign-in session", what: "Keeps you signed in.", lasts: "Until you sign out, or 30 days unused" },
  { name: "Passkey check", what: "A one-time check while you sign in with a passkey.", lasts: "A few minutes" },
  { name: "Invite", what: "Remembers the invite link you opened, until you finish signing in.", lasts: "Up to 30 days" },
  { name: "Light or dark", what: "Your choice of light or dark.", lasts: "A year" },
  { name: "Sidebar", what: "Whether the sidebar is open, on wider screens.", lasts: "A year" },
  { name: "Cookies answer", what: "Your yes or no to counting visits.", lasts: "A year" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      summary={
        <>
          What you write, record and keep in ana is encrypted on your phone before it leaves it. We store it, but we can&rsquo;t
          read it, and neither can anyone else. We never sell anything, show ads, or use your logger to train anything.
        </>
      }
    >
      <Section n={1} title="Who we are">
        <p>
          ana is run by {OPERATOR}, in India (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Under India&rsquo;s Digital Personal Data
          Protection Act, 2023, we are the data fiduciary for the personal data described here. To ask anything, or to use any
          of your rights, write to <Mail />.
        </p>
      </Section>

      <Section n={2} title="What we can't see">
        <p>
          Everything you put into your logger is encrypted on your device with a key only you hold: your practice records, daily
          and weekly reflections and moods, your sankalpa, moments (words, voice notes, photos and videos), the people and things
          you note, and their birthdays. Your key is opened by your passkey, your passphrase or your 12 recovery words, on your
          own devices. We receive and store only the encrypted result.
        </p>
        <p>
          This also means that if you lose your passkey and your recovery words, no one can open your logger, not even us.
        </p>
      </Section>

      <Section n={3} title="What we do keep">
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <b className="font-semibold">Your account</b>, from Google when you sign in: your name, email address, Google profile
            picture and account identifier. Whether you&rsquo;ve been let in, and the invite you used, if any.
          </li>
          <li>
            <b className="font-semibold">What&rsquo;s needed to keep your logger in order</b>, without its content: the dates of
            entries, the kind of each moment, which questions have answers (not the answers), file sizes and types, how much
            storage you use, when you joined and were last active, and, for each person or thing with a birthday, only its day and
            month (no name, no year), so a reminder can find you that morning.
          </li>
          <li>
            <b className="font-semibold">Sign-in and devices</b>: the public part of your passkeys, and the encrypted copies of
            your key (which we can&rsquo;t open). If you turn on notifications, the address your browser gives us for sending
            them.
          </li>
          <li>
            <b className="font-semibold">When something breaks</b>: a technical report (the error, the page, your browser and
            device type), never anything you wrote.
          </li>
          <li>
            <b className="font-semibold">Visit counts</b>, only if you say yes (see section 5).
          </li>
        </ul>
      </Section>

      <Section n={4} title="Why we keep it">
        <p>
          To run ana for you: to sign you in, let you in, store and sync your encrypted logger across your devices, send the
          reminders and notifications you choose, keep the service secure, and fix what goes wrong. We rely on your consent, given
          when you sign up, and you can withdraw it at any time by asking us to delete your account.
        </p>
        <p>We don&rsquo;t sell or rent your data, show ads, build profiles of you, or use your data to train AI.</p>
      </Section>

      <Section n={5} title="Cookies">
        <p>ana uses only the cookies it needs to work. These are always on:</p>
        <ul className="rounded-[16px] border border-line divide-y divide-line">
          {COOKIES.map((c) => (
            <li key={c.name} className="px-4 py-3 sm:flex sm:items-baseline sm:gap-4">
              <span className="font-semibold sm:w-[150px] sm:shrink-0">{c.name}</span>
              <span className="block sm:inline flex-1 text-ink-soft">{c.what}</span>
              <span className="block sm:inline mt-0.5 sm:mt-0 text-[13.5px] text-ink-soft/80 sm:text-right sm:shrink-0">{c.lasts}</span>
            </li>
          ))}
        </ul>
        <p>
          When you first visit, we ask one question: may we count visits? If you say yes, Vercel Web Analytics counts which pages
          are visited, anonymously. It sets no cookies of its own and keeps nothing that identifies you, and we remove anything
          that could point to a person (like the address of a person&rsquo;s page) before it&rsquo;s sent. If you say no, nothing
          is counted. You can change your answer at any time from the &ldquo;Cookies&rdquo; link at the foot of this page.
        </p>
      </Section>

      <Section n={6} title="Who helps us run ana">
        <p>We use a few trusted services, each only for its part, under their own data protection terms:</p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li><b className="font-semibold">Google</b>: signing in.</li>
          <li><b className="font-semibold">Vercel</b>: hosting the app and its database (in Singapore), and, with your yes, visit counts.</li>
          <li><b className="font-semibold">Cloudflare</b>: storing your encrypted photos, voice notes and videos.</li>
          <li><b className="font-semibold">Your browser&rsquo;s notification service</b> (Apple, Google or Mozilla): carrying the notifications you turn on. Their words are general, never from your logger.</li>
        </ul>
        <p>
          Some of these services keep data outside India, such as in Singapore or the United States. We share only what each needs,
          and your logger&rsquo;s content stays encrypted wherever it is.
        </p>
      </Section>

      <Section n={7} title="How long we keep it">
        <p>
          For as long as you have an account. If you ask us to delete it, we delete your account and everything stored with it
          within 30 days. Technical error reports are deleted after 30 days.
        </p>
      </Section>

      <Section n={8} title="Your rights">
        <p>You can, at any time:</p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>download your whole logger as a file, from Profile, Your data;</li>
          <li>ask what personal data we hold about you, and how it&rsquo;s used;</li>
          <li>ask us to correct it, or to delete your account and everything in it;</li>
          <li>withdraw your consent, and change your answer about visit counts;</li>
          <li>name someone to use these rights for you if you&rsquo;re unable to.</li>
        </ul>
        <p>
          Write to <Mail />. We reply within 7 days and resolve requests within 30 days.
        </p>
      </Section>

      <Section n={9} title="Keeping it safe">
        <p>
          Your logger is end-to-end encrypted, and everything travels over encrypted connections. Access to our systems is limited
          to what&rsquo;s needed to run ana. If a breach ever affects your personal data, we&rsquo;ll tell you and the Data
          Protection Board of India as the law requires.
        </p>
      </Section>

      <Section n={10} title="Age">
        <p>ana is for people aged 18 and over. We don&rsquo;t knowingly let in anyone younger.</p>
      </Section>

      <Section n={11} title="Changes">
        <p>
          If we change this policy in a way that matters, we&rsquo;ll tell you in ana before it takes effect. The date at the top
          shows when it last changed.
        </p>
      </Section>

      <Section n={12} title="Questions and complaints">
        <p>
          {OPERATOR} handles questions and grievances: <Mail />. If you&rsquo;re not satisfied with our answer, you can complain to
          the Data Protection Board of India. See also our <Link href="/terms" className="text-accent font-semibold underline underline-offset-2">Terms</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
