import Link from "next/link";
import { DeskContact } from "./DeskContact";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { CookieSettingsButton } from "./MarketingTags";
import { COMPANY, SOCIAL, tel, whatsappLink } from "@/lib/company";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Catalog",
    links: [
      ["Men", "/catalog?line=men"],
      ["Women", "/catalog?line=women"],
      ["Kids", "/catalog?line=kids"],
      ["Waterproof", "/catalog?line=waterproof"],
      ["All products", "/catalog"],
    ],
  },
  {
    title: "For buyers",
    links: [
      ["Send inquiry", "/send-inquiry"],
      ["Line sheet", "/inquiry"],
      ["Buyer desk", "/buyer-desk"],
      ["Size guide", "/size-guide"],
      ["Business planner", "/business-plan"],
      ["Order calendar", "/order-calendar"],
      ["Container planner", "/container-planner"],
      ["Ships to your country", "/ship-to"],
      ["Private label", "/private-label"],
      ["Shipping terms", "/shipping"],
      ["Buyer FAQ", "/faq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Quality", "/quality"],
      ["Verify us", "/verify"],
      ["Meet us", "/meet"],
      ["Contact", "/contact"],
    ],
  },
];

export function Footer() {
  return (
    <footer id="footer" data-deco="footer" className="mt-sec bg-tile px-(--shell-pad) pt-16 pb-10">
      <div className="wrap">
        <DeskContact />
        <div className="mt-16 grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo className="h-14 sm:h-16" />
            <p className="mt-5 max-w-[34ch] text-[15px] text-ink-2">
              Guangzhou Chime Long Trading Co., Ltd. Footwear for retailers, distributors and private-label brands worldwide.
            </p>
            {/* only profiles that exist (src/lib/company.ts) */}
            {SOCIAL.length > 0 && (
              <div className="mt-6 flex gap-2">
                {SOCIAL.map((x) => (
                  <a
                    key={x.label}
                    href={x.href}
                    aria-label={x.label}
                    className="grid size-11 place-items-center rounded-full bg-white text-ink-2 transition-colors hover:text-ink"
                  >
                    <Icon name={x.icon} className="size-[18px]" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-[1fr_1fr_1fr_1.7fr]">
            {COLS.map((c) => (
              <div key={c.title}>
                <h2 className="mb-4 text-[14px] font-semibold">{c.title}</h2>
                <ul className="grid gap-2.5 text-[15px] text-ink-2">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="transition-colors hover:text-ink hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <h2 className="mb-4 text-[14px] font-semibold">Contact</h2>
              <ul className="grid gap-2.5 text-[15px] text-ink-2">
                <li>
                  <a href={tel(COMPANY.phone)} className="flex items-center gap-2.5 transition-colors hover:text-ink">
                    <Icon name="phone" className="size-4 flex-none text-muted" />
                    {COMPANY.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${COMPANY.email.general}`} className="flex items-center gap-2.5 transition-colors hover:text-ink">
                    <Icon name="mail" className="size-4 flex-none text-muted" />
                    {COMPANY.email.general}
                  </a>
                </li>
                {whatsappLink() && (
                  <li>
                    <a href={whatsappLink()!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-ink">
                      <Icon name="whatsapp" className="size-4 flex-none text-muted" />
                      WhatsApp
                    </a>
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <Icon name="clock" className="size-4 flex-none text-muted" />
                  {COMPANY.hours}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-muted">
          <span>© 2026 Guangzhou Chime Long Trading Co., Ltd. Trade buyers only.</span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              ["Terms of trade", "/terms"],
              ["Privacy policy", "/privacy"],
              ["Shipping terms", "/shipping"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-ink">
                {label}
              </Link>
            ))}
            <CookieSettingsButton className="hover:text-ink" />
          </span>
        </div>
      </div>
    </footer>
  );
}
