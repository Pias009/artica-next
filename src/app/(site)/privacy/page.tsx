import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { LegalText } from "@/components/LegalText";
import { PageIntro } from "@/components/PageIntro";
import { COMPANY } from "@/lib/company";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
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
      "To see what buyers need, we count how many questions each day are about each topic (for example shipping or samples). Only the count is kept, for 90 days: never what you typed, your address or anything that identifies you.",
      "To keep the service fair we count how many messages each address sends for up to a day. Please don't share sensitive personal information in the chat.",
    ],
  },
  {
    title: "Visit statistics",
    body: [
      "We count visits to improve the site: the page, the time, the country, the kind of device, the site you came from and searches you make on this site. We set no cookie for this and store nothing on your device.",
      "We don't keep your IP address. A visit is joined up with an anonymous code made from your address and browser and a secret that changes every day, so you can't be followed from one day to the next. If you send an inquiry or sign up for the line sheet, the email you give is noted with that day's visit, so our sales desk can see which pages you looked at. Browsers that send Global Privacy Control or Do Not Track aren't counted. These records are deleted after 90 days.",
    ],
  },
  {
    title: "The business planner",
    body: [
      "What you enter in the business planner (country, stage, budget, prices, styles) is kept in your own browser and in the page address, so you can come back to it or share the link. We don't receive it.",
      "If you use Kai's planning desk, your country, stage, budget and customer lines go with your messages so Kai can answer for your plan. If you send the plan to the trade desk, it reaches us as an inquiry like any other.",
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
      "Inquiries and order records: as long as we trade with you, then as long as tax and trade law requires. Inquiries we mark as spam: 30 days. Line-sheet signups, and buyers who sent an inquiry and get our occasional trade updates: until you unsubscribe.",
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
    body: [
      "Our own visit count uses no cookies. We may use measurement and advertising tags from Meta, Google, LinkedIn, TikTok or Microsoft Clarity to see which ads and posts bring buyers to the site. They load only after you choose “Accept” in the cookie banner, and never if your browser sends Global Privacy Control or Do Not Track.",
      "You can change your choice at any time with “Cookie settings” at the bottom of every page. Every line-sheet email has an unsubscribe link that takes you off the list straight away.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageIntro crumbs={[{ href: "/", label: "Home" }, { label: "Privacy policy" }]} title="Privacy policy." text="What we collect, why, and what you can ask us to do with it." />
      <LegalText updated="November 8, 2026" sections={SECTIONS} />
    </>
  );
}
