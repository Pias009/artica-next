import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Catalog",
    links: [
      ["Men", "/catalog?line=men"],
      ["Women", "/catalog?line=women"],
      ["Kids", "/catalog?line=kids"],
      ["Winter", "/catalog?line=insulated"],
      ["Waterproof", "/catalog?line=waterproof"],
      ["All styles", "/catalog"],
    ],
  },
  {
    title: "For buyers",
    links: [
      ["Line sheet", "/inquiry"],
      ["MOQ and tiers", "/#partner"],
      ["Size charts", "/catalog"],
      ["Shipping terms", "/#service"],
      ["Private label", "/#partner"],
      ["FAQ", "#footer"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "#footer"],
      ["Factory", "/#tech"],
      ["Quality", "/#tech"],
      ["Careers", "#footer"],
      ["Contact", "#footer"],
    ],
  },
];

const CONTACT: [IconName, string][] = [
  ["phone", "+1 (000) 000-0000"],
  ["mail", "sales@yourbrand.com"],
  ["pin", "Showroom address"],
  ["clock", "Mon–Fri 9:00–18:00 EST"],
];

const SOCIAL: [IconName, string][] = [
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
  ["whatsapp", "WhatsApp"],
  ["youtube", "YouTube"],
];

export function Footer() {
  return (
    <footer id="footer" className="mt-sec rounded-shell border border-line/60 bg-tile p-6 sm:p-10 shadow-soft">
      <div className="grid grid-cols-2 gap-8 pb-8 sm:grid-cols-3 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
        <div className="col-span-full lg:col-span-1">
          <Logo />
          <p className="mt-3.5 max-w-[30ch] text-[13px] leading-relaxed text-ink-2">
            Direct wholesale footwear atelier engineered for harsh North American retail conditions.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="mono-label rounded-md bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">
              VERIFIED OEM ATELIER
            </span>
            <span className="mono-label text-[9px] text-muted">[ EST. 2026 ]</span>
          </div>
          <div className="mt-5 flex gap-2.5">
            {SOCIAL.map(([icon, label]) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="hit-44 relative grid size-9 place-items-center rounded-xl border border-line/60 bg-surface text-ink-2 transition-all hover:bg-chip hover:text-ink hover:border-ink/20 shadow-xs"
              >
                <Icon name={icon} className="size-4" />
              </a>
            ))}
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-[11px] font-extrabold tracking-[.1em] uppercase text-ink">{c.title}</h4>
            <ul className="grid gap-1.5 text-[13px] text-ink-2">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="inline-block py-0.5 transition-colors hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="mb-3 text-[11px] font-extrabold tracking-[.1em] uppercase text-ink">Showroom & Trade</h4>
          <ul className="grid gap-2.5 text-[13px] text-ink-2">
            {CONTACT.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2">
                <Icon name={icon} className="size-3.5 text-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-6 text-xs text-muted">
        <span>© 2026 ARTICA Wholesale Footwear. All designs protected. Trade buyers direct.</span>
        <div className="flex gap-4 sm:gap-7 font-medium">
          <Link href="#footer" className="hover:text-ink">Privacy policy</Link>
          <Link href="#footer" className="hover:text-ink">Terms of trade</Link>
          <Link href="#footer" className="hover:text-ink">Compliance standards</Link>
        </div>
      </div>
    </footer>
  );
}
