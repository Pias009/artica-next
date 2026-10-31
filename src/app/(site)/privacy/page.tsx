import type { Metadata } from "next";
import { LegalText } from "@/components/LegalText";
import { PageIntro } from "@/components/PageIntro";
import { COMPANY } from "@/lib/company";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description: "What Chime Long collects when you send an inquiry or sign up for line sheets, why, and your rights.",
  path: "/privacy",
});

// A working draft written from what the site actually collects: the client's lawyer reviews it before launch.
const SECTIONS = [
  {
    title: "Who we are",
    body: [
      `${COMPANY.name} ("Chime Long", "we") runs this website for trade buyers. We decide how the information you send us is used. Questions about your data go to ${COMPANY.email.general}.`,
    ],
  },
  {
    title: "What we collect",
    body: [
      "When you send an inquiry: your company name, work email, buyer type, the country you ship to, the styles and quantities you chose, what you are asking for (a quote, samples, a visit…) and any note you write. We also note the country you browsed from, the page you sent it from and the season the site showed you, but not your IP address.",
      "When you sign up for line sheets: your work email and the page you signed up on.",
      "Your inquiry list is kept in your own browser (local storage) so it is still there when you come back. It reaches us only when you send it.",
      "Our hosting provider keeps standard server logs (such as IP address and browser type) to run and protect the site.",
    ],
  },
  {
    title: "The trade assistant (Kai)",
    body: [
      "Kai, the chat assistant on this site, is an AI model. What you type is sent to our AI provider (Google's Gemini API) to write the answer.",
      "We don't keep chat conversations. The conversation stays in your browser tab until you close it. If you send an inquiry from the chat, it reaches us like any other inquiry, marked as prepared with Kai.",
      "To keep the service fair we count how many messages each address sends for up to a day. Please don't share sensitive personal information in the chat.",
    ],
  },
  {
    title: "Why we use it",
    body: [
      "To answer your inquiry, send line sheets, samples and quotes, and arrange orders. This is a step you ask us to take before a possible contract.",
      "To send season line sheets when you sign up. This is based on your consent, and you can withdraw it at any time.",
      "To keep the site secure and working, which is our legitimate interest.",
    ],
  },
  {
    title: "Who we share it with",
    body: [
      "Our database provider (to keep your inquiry), our email delivery provider (to pass your inquiry to our trade desk, send you a confirmation and, if you sign up, line sheets), our hosting provider and our image host. They process data only on our instructions.",
      "Freight forwarders and inspection companies, only when you place an order that needs them. We never sell your data.",
    ],
  },
  {
    title: "International transfers",
    body: [
      "Our team works in China and our service providers may process data in other countries, including the United States. Where the law requires it, we use safeguards such as standard contractual clauses.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Inquiries and order records: as long as we trade with you, then as long as tax and trade law requires. Inquiries we mark as spam: 30 days. Line-sheet signups: until you unsubscribe.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "You can ask to see, correct or delete your data, object to how we use it, or take a copy of it. If you are in the EU or UK you can also complain to your data protection authority.",
      `Write to ${COMPANY.email.general}, quoting your inquiry reference (such as CL-2026-0142) if you have one, and we reply within one month.`,
    ],
  },
  {
    title: "Cookies",
    body: ["This site does not use advertising or tracking cookies. If that changes, we will ask for your consent first and update this page."],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageIntro crumbs={[{ href: "/", label: "Home" }, { label: "Privacy policy" }]} title="Privacy policy." text="What we collect, why, and what you can ask us to do with it." />
      <LegalText updated="October 22, 2026" sections={SECTIONS} />
    </>
  );
}
