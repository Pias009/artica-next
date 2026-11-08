"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { SectionScope } from "./ui/SectionScope";
import { Txt, TxtCatalog, useTxt } from "./ui/Txt";
import { requestContact, type ContactResult } from "@/app/actions";
import { FOOTER_BLOCK } from "@/lib/home-sections";


/**
 * "Talk to the desk": a buyer leaves a work email (and a WhatsApp number if they like) and picks what they want: a
 * trade assistant writing to them directly (an inquiry, "Contact request", in Admin → Inquiries) and/or email
 * updates on new styles and order dates. In the footer of every page, and on the inquiry page under the list, where
 * the footer's copy steps aside so it never shows twice.
 */
export function DeskContact({ where = "footer" }: { where?: "footer" | "page" }) {
  const pathname = usePathname();
  if (where === "footer" && pathname === "/inquiry") return null;
  return (
    <SectionScope id={FOOTER_BLOCK.id}>
      <Box source={pathname} />
    </SectionScope>
  );
}

function Box({ source }: { source: string }) {
  const uid = useId();
  const [state, action, pending] = useActionState<ContactResult, FormData>(requestContact, { status: "idle" });
  const [contact, setContact] = useState(true);
  const [updates, setUpdates] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const emailHint = useTxt("emailPlaceholder", "you@yourstore.com");
  const phoneHint = useTxt("phonePlaceholder", "+1 415 555 0134");
  const err = state.status === "error" ? state : null;

  return (
    <div id="talk-to-desk" data-deco="card" className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)] gap-8 rounded-shell bg-white p-[clamp(22px,4vw,48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-14">
      <div className="min-w-0">
        <p className="flex items-center gap-3">
          <span className="relative grid size-11 flex-none place-items-center rounded-full bg-brand-soft text-brand">
            <Icon name="chat" className="size-5" />
            <span aria-hidden="true" className="absolute right-0 bottom-0 size-3 rounded-full bg-[#2f9e5b] ring-2 ring-white" />
          </span>
          <span className="leading-tight">
            <Txt k="desk" label="Who answers" className="block text-[14px] font-semibold">
              Trade desk, Guangzhou
            </Txt>
            <Txt k="promise" label="Reply time" className="block text-[13px] text-muted">
              A real person replies within one working day
            </Txt>
          </span>
        </p>
        <h2 className="mt-6 font-headline text-[clamp(26px,2.8vw,36px)] leading-[1.1] font-semibold tracking-[-0.02em]">
          <Txt k="headline" label="Headline" rich>
            Leave your email. <em>Our trade assistant will write to you.</em>
          </Txt>
        </h2>
        <Txt as="p" k="line" label="Line under the headline" className="mt-3 max-w-[46ch] text-[16px] text-ink-2">
          Pricing, samples, the right styles for your market and the dates to order by, straight to your inbox.
        </Txt>
        <ul className="mt-6 flex flex-col gap-2.5 text-[14.5px] text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {(
            [
              ["point1", "New styles each season", "sample"],
              ["point2", "Order-by dates for your market", "clock"],
              ["point3", "Direct answers, no bots", "mail"],
            ] as const
          ).map(([k, text, icon]) => (
            <li key={k} className="flex items-center gap-2 whitespace-nowrap">
              <Icon name={icon} className="size-4 flex-none text-brand" />
              <Txt k={k} label="Point">
                {text}
              </Txt>
            </li>
          ))}
        </ul>
      </div>

      {state.status === "success" ? (
        <div aria-live="polite" className="flex min-w-0 flex-col justify-center rounded-[18px] bg-tile p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
            <Icon name="check" className="size-6" />
          </span>
          <p className="mt-5 font-headline text-[22px] leading-tight font-semibold">
            <Txt k="thanks" label="After sending: headline">
              Thank you. You&rsquo;ll hear from us.
            </Txt>
          </p>
          {state.contact && (
            <p className="mt-2 text-[15px] text-ink-2">
              <Txt k="thanksContact" label="After sending: who writes">
                A trade assistant will write to
              </Txt>{" "}
              <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{state.email}</strong>{" "}
              <Txt k="thanksWhen" label="After sending: when">
                within one working day.
              </Txt>
              {state.ref && (
                <span className="mt-1 block text-[13px] text-muted">
                  <Txt k="thanksRef" label="After sending: reference">
                    Your reference
                  </Txt>{" "}
                  <span className="font-semibold text-ink tabular-nums">{state.ref}</span>
                </span>
              )}
            </p>
          )}
          {state.updates && (
            <p className="mt-2 text-[15px] text-ink-2">
              <Txt k="thanksUpdates" label="After sending: email updates">
                You&rsquo;re on the list for new styles and order dates.
              </Txt>
            </p>
          )}
          {!state.delivered && <p className="mt-3 text-[12px] text-muted">Demo mode: email delivery isn&rsquo;t connected yet, so nothing was sent.</p>}
        </div>
      ) : (
        <form action={action} noValidate className="min-w-0 self-center">
          <label htmlFor={`${uid}-email`} className="mb-2 block pl-5 text-[13px] font-semibold">
            <Txt k="emailLabel" label="Email box label">
              Work email
            </Txt>
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder={emailHint}
            aria-invalid={err?.field === "email" || undefined}
            aria-describedby={err ? `${uid}-err` : undefined}
            className="h-13 w-full rounded-full bg-tile px-5 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-ink"
          />

          {phoneOpen || err?.field === "phone" ? (
            <div className="mt-3">
              <label htmlFor={`${uid}-phone`} className="mb-2 block pl-5 text-[13px] font-semibold">
                <Txt k="phoneLabel" label="WhatsApp box label">
                  WhatsApp or phone
                </Txt>{" "}
                <span className="font-normal text-muted">
                  <Txt k="optional" label="Optional">
                    (optional)
                  </Txt>
                </span>
              </label>
              <input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={phoneHint}
                aria-invalid={err?.field === "phone" || undefined}
                autoFocus={phoneOpen}
                className="h-13 w-full rounded-full bg-tile px-5 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-ink"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setPhoneOpen(true)} className="mt-2.5 ml-5 inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:text-brand-deep">
              <Icon name="plus" className="size-3.5" />
              <Txt k="addPhone" label="Add WhatsApp link">
                Add WhatsApp for a faster reply
              </Txt>
            </button>
          )}

          <fieldset className="mt-5" aria-describedby={err?.field === "want" ? `${uid}-err` : undefined}>
            <legend className="mb-2 pl-5 text-[13px] font-semibold">
              <Txt k="wantLabel" label="Choice label">
                What would you like?
              </Txt>
            </legend>
            <div className="flex flex-wrap gap-2">
              <Choice name="contact" on={contact} set={setContact}>
                <Txt k="wantContact" label="Choice: contact">
                  A message from the desk
                </Txt>
              </Choice>
              <Choice name="updates" on={updates} set={setUpdates}>
                <Txt k="wantUpdates" label="Choice: updates">
                  New styles and order dates
                </Txt>
              </Choice>
            </div>
          </fieldset>

          <input type="hidden" name="source" value={source} />
          {/* one key per form, so a double submit stores one request; set on the device only, after the page loads */}
          <input type="hidden" name="key" defaultValue="" ref={(el) => void (el && !el.value && (el.value = crypto.randomUUID()))} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />

          {err && (
            <p id={`${uid}-err`} role="alert" className="mt-4 pl-5 text-[13.5px] text-danger">
              {err.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn btn-dark mt-5 w-full sm:w-auto">
            {pending ? (
              <Txt k="sending" label="Button while sending">
                Sending…
              </Txt>
            ) : contact || !updates ? (
              <Txt k="submit" label="Button">
                Ask the desk to contact me
              </Txt>
            ) : (
              <Txt k="submitUpdates" label="Button (updates only)">
                Sign me up
              </Txt>
            )}
            {!pending && <Icon name="arrow" className="size-4" />}
          </button>
          <p className="mt-3 pl-5 text-[12px] text-muted">
            <Txt k="fine" label="Small print">
              Trade buyers only. No spam; unsubscribe any time.
            </Txt>{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              <Txt k="privacy" label="Privacy link">
                Privacy policy
              </Txt>
            </Link>
          </p>

          {/* the words shown only in some states, listed for the admin panel */}
          <TxtCatalog
            items={[
              ["sending", "Button while sending", "Sending…"],
              ["submitUpdates", "Button (updates only)", "Sign me up"],
              ["phoneLabel", "WhatsApp box label", "WhatsApp or phone"],
              ["optional", "Optional", "(optional)"],
              ["thanks", "After sending: headline", "Thank you. You’ll hear from us."],
              ["thanksContact", "After sending: who writes", "A trade assistant will write to"],
              ["thanksWhen", "After sending: when", "within one working day."],
              ["thanksRef", "After sending: reference", "Your reference"],
              ["thanksUpdates", "After sending: email updates", "You’re on the list for new styles and order dates."],
              ["emailPlaceholder", "Email box hint", "you@yourstore.com"],
              ["phonePlaceholder", "WhatsApp box hint", "+1 415 555 0134"],
            ]}
          />
        </form>
      )}
    </div>
  );
}

/** A choice chip: a real checkbox (sent with the form), drawn as a pill with a tick. */
function Choice({ name, on, set, children }: { name: string; on: boolean; set: (v: boolean) => void; children: ReactNode }) {
  return (
    <label
      className={clsx(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
        on ? "bg-ink text-white" : "bg-tile text-ink-2 hover:bg-chip-hover",
      )}
    >
      <input type="checkbox" name={name} checked={on} onChange={(e) => set(e.target.checked)} className="sr-only" />
      <span aria-hidden="true" className={clsx("grid size-4.5 place-items-center rounded-full transition-colors", on ? "bg-white text-ink" : "ring-1 ring-ink/25")}>
        {on && <Icon name="check" className="size-3" />}
      </span>
      {children}
    </label>
  );
}
