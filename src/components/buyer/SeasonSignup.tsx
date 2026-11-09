"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useId } from "react";
import { Icon } from "../Icon";
import { subscribe, type SignupResult } from "@/app/actions";
import { tagEvent } from "@/lib/marketing/tags";

/**
 * "Next line sheet first": one email field, for buyers who aren't ready to order this season. `heading` sets the title's
 * level so it nests under the page it sits in (h2 in the footer, h3 inside a page section).
 */
export function SeasonSignup({ heading: Heading = "h2" }: { heading?: "h2" | "h3" }) {
  const uid = useId();
  const pathname = usePathname();
  const [state, action, pending] = useActionState<SignupResult, FormData>(subscribe, { status: "idle" });
  useEffect(() => {
    if (state.status === "success") tagEvent("signup");
  }, [state]);

  return (
    <div data-deco="card" className="grid items-center gap-6 rounded-shell bg-white p-[clamp(20px,4vw,40px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-12">
      <div>
        <Heading className="font-headline text-[clamp(24px,2.6vw,32px)] leading-tight font-semibold tracking-[-0.02em]">Get the next line sheet first.</Heading>
        <p className="mt-2 max-w-[46ch] text-[15px] text-ink-2">New styles and order dates for each season, about four emails a year.</p>
      </div>

      {state.status === "success" ? (
        <p aria-live="polite" className="flex items-start gap-2.5 text-[15px] font-semibold">
          <Icon name="check" className="mt-0.5 size-5 flex-none text-brand" />
          <span>
            You&rsquo;re on the list.
            {!state.delivered && (
              <span className="mt-1 block text-[12px] font-normal text-muted">Demo mode: email delivery isn&rsquo;t connected yet, so nothing was sent.</span>
            )}
          </span>
        </p>
      ) : (
        <form action={action}>
          <label htmlFor={`${uid}-email`} className="mb-2 block pl-6 text-[13px] font-semibold">
            Work email
          </label>
          <div className="flex items-center gap-2 rounded-full bg-tile p-1.5 pl-6 focus-within:ring-2 focus-within:ring-ink">
            <input
              id={`${uid}-email`}
              name="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="you@yourstore.com"
              aria-invalid={state.status === "error" || undefined}
              aria-describedby={state.status === "error" ? `${uid}-err` : undefined}
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
            <input type="hidden" name="from" value={pathname} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
            <button type="submit" disabled={pending} className="btn btn-dark">
              {pending ? "Signing up…" : "Sign up"}
            </button>
          </div>
          {state.status === "error" && (
            <p id={`${uid}-err`} className="mt-2 pl-6 text-[13px] text-danger">
              {state.error}
            </p>
          )}
          <p className="mt-2 pl-6 text-[12px] text-muted">
            Unsubscribe any time. See our{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              privacy policy
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
}
