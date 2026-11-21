import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon, type IconName } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { AskInquiryButton } from "@/components/inquiry/AskInquiry";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { SectionHead } from "@/components/ui/SectionHead";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Contact the wholesale trade desk",
  description: "Contact the Chime Long trade desk for wholesale pricing, line sheets, samples and showroom appointments. Replies within 24 hours.",
  path: "/contact",
});

const SHOWROOMS: {
  city: string;
  type: string;
  address: string;
  notes: string;
  hours: string;
  icon: IconName;
}[] = [
  {
    city: "New York showroom",
    type: "Sales and samples",
    address: "530 7th Avenue, 14th Floor, New York, NY 10018",
    notes: "Full footwear collection on display. Physical size runs available for buyer fitting.",
    hours: "Mon–Fri, 9:00–17:30 EST, by appointment",
    icon: "pin",
  },
  {
    city: "Montreal design atelier",
    type: "Laboratory and prototypes",
    address: "4205 Saint-Laurent Blvd, Montreal, QC H2W 1Z4",
    notes: "Cold-room testing laboratory, leather swatch archives, and technical CAD development.",
    hours: "Mon–Fri, 9:00–17:00 EST, by appointment",
    icon: "shield",
  },
  {
    city: "Ningbo export logistics",
    type: "Port logistics and shipping",
    address: "Tower 2, International Trade Center, Ningbo 315000",
    notes: "Container consolidation hub, customs documentation, and pre-shipment inspection verification.",
    hours: "Mon–Sat, 8:30–18:30 CST",
    icon: "truck",
  },
];

const DEPARTMENTS = [
  {
    role: "Retail accounts and line sheets",
    email: "buyers@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 1",
    tel: "+18004128820,1",
    desc: "For independent boutiques, department stores, and e-commerce stockists ordering existing catalog styles.",
  },
  {
    role: "Private label and OEM projects",
    email: "oem@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 2",
    tel: "+18004128820,2",
    desc: "For custom tooling, private-label branding, custom Pantone dyeing, and exclusive last development.",
  },
  {
    role: "Freight, customs and DDP tracking",
    email: "logistics@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 3",
    tel: "+18004128820,3",
    desc: "Container manifests, Bill of Lading releases, import customs entry numbers in your country, and dock scheduling.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Contact and showrooms" }]}
        eyebrow="Commercial trade inquiries"
        title="Talk to the trade desk."
        text="Showroom visits, samples, line sheets or a shipment on the water: one team, a reply within 24 hours."
      />

      {/* Showrooms: the first section after the intro, so the intro's own margin is the gap */}
      <section aria-labelledby="h-hubs">
        <SectionHead
          id="h-hubs"
          eyebrow="Physical hubs"
          title={<>Showrooms and <em>laboratories.</em></>}
          right={<p className="type-label text-muted">Trade buyers only · by appointment</p>}
        />
        <ul className="grid gap-3.5 lg:grid-cols-3">
          {SHOWROOMS.map((s) => (
            <li key={s.city} className="flex flex-col rounded-card bg-tile p-6">
              <span className="flex items-center justify-between gap-3">
                <Icon name={s.icon} className="size-6! stroke-[1.4] text-brand" />
                <span className="type-label text-muted">{s.type}</span>
              </span>
              <h3 className="mt-6 font-headline text-[24px] leading-tight font-semibold tracking-[-0.01em]">{s.city}</h3>
              <p className="mt-2 text-[15px] font-semibold">{s.address}</p>
              <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-ink-2">{s.notes}</p>
              <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-[14px] text-ink-2">
                <Icon name="clock" className="size-4 text-muted" />
                {s.hours}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Department contacts */}
      <section aria-labelledby="h-directory" className="mt-sec">
        <SectionHead id="h-directory" eyebrow="Directory" title={<>Reach the right <em>department.</em></>} />
        <ul className="grid gap-3.5 md:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <li key={d.role} className="flex flex-col rounded-card bg-tile p-6">
              <h3 className="text-[16px] font-semibold">{d.role}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{d.desc}</p>
              <div className="mt-5 grid gap-1 border-t border-line pt-3 text-[14px]">
                <a href={`mailto:${d.email}`} className="inline-flex min-h-10 items-center gap-2.5 font-semibold hover:text-brand">
                  <Icon name="mail" className="size-4 text-muted" />
                  {d.email}
                </a>
                <a href={`tel:${d.tel}`} className="inline-flex min-h-10 items-center gap-2.5 text-ink-2 hover:text-brand">
                  <Icon name="phone" className="size-4 text-muted" />
                  {d.phone}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ClosingBand
        id="h-walkthrough"
        eyebrow="Digital showroom preview"
        title="Book a one-to-one virtual walkthrough."
        text="Can't visit New York or Montreal? Our accounts team hosts a 20-minute private video call to show samples, leather swatches and case-pack curves."
        action={
          <div className="flex flex-none flex-col items-start gap-2 md:items-end">
            <OpenInquiryButton className="btn bg-white text-ink hover:bg-white/85">
              Book a walkthrough <Icon name="arrow" />
            </OpenInquiryButton>
            <AskInquiryButton className="btn flex-none text-white ring-1 ring-white/30 hover:bg-white/10" />
            <Link href="/catalog" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
              Browse the catalog first
            </Link>
          </div>
        }
      />
    </>
  );
}
