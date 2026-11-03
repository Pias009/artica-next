import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Link from "next/link";
import { IntroImage } from "@/components/buyer/IntroImage";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { REGISTRATION, VERIFY_STEPS } from "@/lib/buyer-desk";
import { COMPANY, tel } from "@/lib/company";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Verify us: check a shoe supplier in China",
  description: "Check Chime Long before you pay: company registration, a live factory tour, a company bank account only, and inspection before the balance.",
  path: "/verify",
});

export default function VerifyPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Verify us" },
        ]}
        title="Check your shoe supplier before you pay."
        text="Buying from a new supplier overseas takes trust. Here is every way to check us before the first deposit."
        aside={<IntroImage src="/images/hero-gallery-bg.jpg" alt="Chime Long branded shoe boxes stacked in the studio" />}
      />

      {/* the one rule, first: payment fraud by email is the biggest risk in cross-border buying */}
      <section aria-labelledby="h-bank" className="rounded-shell bg-brand-soft p-[clamp(24px,5vw,56px)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <Icon name="lock" className="mt-1 size-7! flex-none stroke-[1.4] text-brand" />
            <div>
              <h2 id="h-bank" className="type-section">
                We never change bank details <em>by email.</em>
              </h2>
              <p className="mt-3 max-w-[60ch] text-[17px] text-ink-2">
                If a message says our account has changed, don&rsquo;t pay. Call us on the number on this page and check first.
              </p>
            </div>
          </div>
          <a href={tel(COMPANY.phone)} className="btn btn-dark flex-none">
            <Icon name="phone" className="size-4" /> {COMPANY.phone}
          </a>
        </div>
      </section>

      <section aria-labelledby="h-ways" className="mt-sec">
        <SectionHead id="h-ways" title="Four ways to check us." />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {VERIFY_STEPS.map((s) => (
            <li key={s.title} data-deco="card" className="rounded-card bg-tile p-6">
              <Icon name={s.icon} className="size-6! stroke-[1.4] text-brand" />
              <p className="mt-6 text-[16px] font-semibold">{s.title}</p>
              <p className="mt-1.5 text-[14px] text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-reg" className="mt-sec grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <SectionHead id="h-reg" title="Company registration." sub="Ask for the licence itself and we send a copy with your quote." className="mb-6!" />
          <div className="flex flex-wrap gap-2">
            <OpenInquiryButton note="Please send your business licence and company registration." className="btn btn-dark">
              Request the licence <Icon name="arrow" />
            </OpenInquiryButton>
            <Link href="/meet" className="btn btn-line">
              Book a factory tour
            </Link>
          </div>
        </div>
        <dl className="overflow-hidden rounded-card bg-tile">
          {REGISTRATION.map((r) => (
            <div key={r.label} className="grid gap-1 border-b border-line px-5 py-3.5 last:border-0 sm:grid-cols-[220px_1fr]">
              <dt className="text-[14px] text-muted">{r.label}</dt>
              <dd className={r.value ? "text-[15px] font-semibold" : "text-[15px] text-ink-2"}>{r.value || "Sent on request"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
