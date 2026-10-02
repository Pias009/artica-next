"use client";

import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { useUI } from "@/lib/store";

const POINTS = ["Every style and size run", "Case-pack ratios", "Tier pricing within 24 hours"];

/** Closing: email-first line-sheet request; hands the email to the inquiry drawer. */
export function LineSheetCta() {
  const openDrawer = useUI((s) => s.openDrawer);
  const [email, setEmail] = useState("");
  const ref = useRef<HTMLElement>(null);

  // Content rises in once as the band arrives.
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-sheet] > *", {
          y: 24,
          opacity: 0,
          ease: "expo.out",
          duration: 0.9,
          stagger: 0.08,
          scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="line-sheet" aria-labelledby="h-sheet" className="bleed bg-linesheet mt-sec overflow-hidden">
      <div data-sheet className="wrap px-(--shell-pad) py-[clamp(72px,9vw,136px)] text-center">
        <h2 id="h-sheet" className="type-section mx-auto max-w-[16ch]">
          Get the full FW26 line sheet.
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[17px] text-ink-2">Every style, size run and case-pack ratio, with tier pricing for your volume.</p>
        <form
          className="mx-auto mt-9 flex max-w-[520px] items-center gap-2 rounded-full bg-white p-1.5 pl-6 text-left shadow-soft focus-within:ring-2 focus-within:ring-ink"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            if (!f.checkValidity()) return f.reportValidity();
            openDrawer(undefined, email.trim());
          }}
        >
          <label htmlFor="ls-email" className="sr-only">
            Work email
          </label>
          <input
            id="ls-email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@yourstore.com"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
          <button type="submit" className="btn btn-dark">
            Send it to me
          </button>
        </form>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
              <Icon name="check" className="size-4 text-glacier" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[13px] text-muted">Trade buyers only. No retail orders.</p>
      </div>
    </section>
  );
}
