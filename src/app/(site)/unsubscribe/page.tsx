import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { unsubscribeAction } from "@/app/actions";
import { unsubscribeTokenOk } from "@/lib/marketing/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/**
 * The unsubscribe link in every campaign email (lib/marketing/unsubscribe.ts). Opening the link only asks: link
 * scanners in mail systems open every link, and must not take anyone off the list. Mail apps' own one-click
 * unsubscribe goes to /api/unsubscribe instead.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const sp = await searchParams;
  const sid = one(sp.s);
  const token = one(sp.t);
  const done = one(sp.done) === "1";
  const valid = unsubscribeTokenOk(sid, token);

  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Unsubscribe" }]}
        title={done ? "You're unsubscribed." : "Unsubscribe."}
        text={done ? "You won't get any more line sheets or updates from us. Inquiries you send still get their replies." : "Stop the line-sheet and season emails."}
      />
      <div className="mx-auto max-w-[640px] pb-24">
        {done ? (
          <p className="text-[15px] text-ink-2">
            Changed your mind? Sign up again at the bottom of the{" "}
            <Link href="/" className="font-semibold text-brand underline-offset-4 hover:underline">
              home page
            </Link>
            .
          </p>
        ) : valid ? (
          <form action={unsubscribeAction} className="rounded-shell bg-white p-[clamp(20px,4vw,32px)]">
            <input type="hidden" name="s" value={sid} />
            <input type="hidden" name="t" value={token} />
            <p className="text-[15px] text-ink-2">
              Take subscriber <strong className="text-ink tabular-nums">{sid}</strong> off our mailing list?
            </p>
            <button type="submit" className="mt-5 min-h-12 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-hover">
              Unsubscribe
            </button>
          </form>
        ) : (
          <p className="text-[15px] text-ink-2">
            This link isn&apos;t complete or has expired. Use the unsubscribe link at the bottom of our latest email, or reply to it with &ldquo;unsubscribe&rdquo; and we&apos;ll take you off the list.
          </p>
        )}
      </div>
    </>
  );
}
