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
      ["Waterproof", "/catalog?line=waterproof"],
      ["All products", "/catalog"],
    ],
  },
  {
    title: "For buyers",
    links: [
      ["Line sheet", "/inquiry"],
      ["Private label", "/private-label"],
      ["Shipping terms", "/shipping"],
      ["Buyer FAQ", "/faq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
    ],
  },
];

// Client placeholders: replace with the real phone, email and address.
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
    <footer id="footer" className="mt-sec bg-tile px-(--shell-pad) pt-16 pb-10">
      <div className="wrap">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo className="h-14 sm:h-16" />
            <p className="mt-5 max-w-[34ch] text-[15px] text-ink-2">
              Guangzhou Chime Long Trading Co., Ltd. Winter boots for retailers, distributors and private-label brands across North America.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIAL.map(([icon, label]) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid size-11 place-items-center rounded-full bg-white text-ink-2 transition-colors hover:text-ink"
                >
                  <Icon name={icon} className="size-[18px]" />
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
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
                {CONTACT.map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-2.5">
                    <Icon name={icon} className="size-4 flex-none text-muted" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[13px] text-muted">
          <span>© 2026 Guangzhou Chime Long Trading Co., Ltd. Trade buyers only.</span>
          <div className="flex gap-6">
            <Link href="#footer" className="hover:text-ink">
              Privacy policy
            </Link>
            <Link href="#footer" className="hover:text-ink">
              Terms of trade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
