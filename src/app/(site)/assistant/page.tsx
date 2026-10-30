import type { Metadata } from "next";
import Link from "next/link";
import { KaiAvatar, KaiChat } from "@/components/assistant/KaiChat";
import "@/components/assistant/kai.css";
import { ASSISTANT } from "@/lib/assistant/persona";
import { COMPANY } from "@/lib/company";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: `Ask ${ASSISTANT.name}, our trade assistant`,
  description: "Get style picks for your market and season, MOQ and payment terms, shipping to your country, and send a wholesale inquiry, in a chat.",
  path: "/assistant",
});

const CAN = [
  "Pick styles that sell in your country and season",
  "Show what's selling now and what buyers ask for most",
  "Explain MOQ, case packs, samples, payment and lead times",
  "Check shipping, import rules and container loads to your market",
  "Prepare your inquiry and send it to the trade desk",
];

/** The chat with Kai on its own page: the same conversation as the pop-up, with room for product grids. */
export default function AssistantPage() {
  return (
    <div className="wrap grid gap-6 pt-8 pb-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10 lg:pt-12">
      <aside className="grid content-start gap-5">
        <div className="flex items-center gap-3">
          <KaiAvatar className="size-14 text-[22px]" />
          <div>
            <h1 className="font-headline text-[32px] leading-tight font-semibold tracking-[-0.015em]">{ASSISTANT.name}</h1>
            <p className="text-[14px] text-ink-2">{ASSISTANT.role}</p>
          </div>
        </div>
        <ul className="grid gap-2 text-[14px] text-ink-2">
          {CAN.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
              {c}
            </li>
          ))}
        </ul>
        <p className="kai-glass rounded-[20px] p-4 text-[13px] text-ink-2">
          {ASSISTANT.name} is an AI assistant: it answers from our catalog and terms, and the trade desk confirms every price and order. Prefer a
          person? Write to{" "}
          <a href={`mailto:${COMPANY.email.general}`} className="font-semibold underline">
            {COMPANY.email.general}
          </a>{" "}
          or <Link href="/inquiry" className="font-semibold underline">send an inquiry</Link>.
        </p>
      </aside>
      <section aria-label={`Chat with ${ASSISTANT.name}`} className="kai-glass relative isolate h-[calc(100dvh-170px)] min-h-[520px] overflow-hidden rounded-[32px] p-4 sm:p-6">
        <span aria-hidden="true" className="kai-ambient" />
        <KaiChat wide autoFocus />
      </section>
    </div>
  );
}
