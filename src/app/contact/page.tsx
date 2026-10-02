import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon, type IconName } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";

export const metadata: Metadata = {
  title: "Contact & Showrooms · ARTICA Wholesale",
  description: "Schedule showroom appointments in New York and Montreal, contact our trade desk, or request wholesale line sheets and samples.",
};

const SHOWROOMS: {
  city: string;
  type: string;
  address: string;
  notes: string;
  hours: string;
  icon: IconName;
}[] = [
  {
    city: "New York Showroom",
    type: "COMMERCIAL SALES & SAMPLES",
    address: "530 7th Avenue, 14th Floor, New York, NY 10018",
    notes: "Full seasonal collection on display. Physical size runs 7–13 available for buyer fitting.",
    hours: "Mon–Fri: 9:00 AM – 5:30 PM EST (By Appointment)",
    icon: "pin",
  },
  {
    city: "Montreal Design Atelier",
    type: "LABORATORY & PROTOTYPES",
    address: "4205 Saint-Laurent Blvd, Montreal, QC H2W 1Z4",
    notes: "Cold-room testing laboratory, leather swatch archives, and technical CAD development.",
    hours: "Mon–Fri: 9:00 AM – 5:00 PM EST (By Appointment)",
    icon: "shield",
  },
  {
    city: "Export Logistics Operations",
    type: "PORT LOGISTICS & SHIPPING",
    address: "Tower 2, International Trade Center, Ningbo 315000",
    notes: "Container consolidation hub, customs documentation, and pre-shipment inspection verification.",
    hours: "Mon–Sat: 8:30 AM – 6:30 PM CST",
    icon: "truck",
  },
];

const DEPARTMENTS = [
  {
    role: "Retail Accounts & Line Sheets",
    email: "buyers@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 1",
    desc: "For independent boutiques, department stores, and e-commerce stockists ordering existing catalog styles.",
  },
  {
    role: "Private Label & OEM Projects",
    email: "oem@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 2",
    desc: "For custom tooling, private-label branding, custom Pantone dyeing, and exclusive last development.",
  },
  {
    role: "Freight, Customs & DDP Tracking",
    email: "logistics@articafootwear.com",
    phone: "+1 (800) 412-8820 ext. 3",
    desc: "Container manifests, Bill of Lading releases, US CBP/Canada CBSA entry numbers, and dock scheduling.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Contact & Showrooms" }]}
        eyebrow="Commercial Trade Inquiries"
        title="Direct access to our trade desk."
        text="Whether scheduling an in-person showroom preview, ordering swatch rings, or tracking a container shipment, our wholesale team is here to assist."
      />

      {/* Showrooms Grid */}
      <section className="mt-sec">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mono-label text-accent font-bold">PHYSICAL HUBS</span>
            <h2 className="type-section mt-1">Showrooms & Laboratories</h2>
          </div>
          <span className="mono-label text-xs text-muted">TRADE BUYERS ONLY · BY APPOINTMENT</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {SHOWROOMS.map((s) => (
            <div key={s.city} className="flex flex-col justify-between rounded-shell border border-line/60 bg-tile p-6 card-lift shadow-soft">
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-surface border border-line/60 text-accent shadow-xs">
                    <Icon name={s.icon} className="size-5" />
                  </div>
                  <span className="mono-label text-[9px] text-accent font-bold">{s.type}</span>
                </div>
                <h3 className="mt-4 text-xl font-extrabold uppercase text-ink">{s.city}</h3>
                <p className="mt-2 text-xs font-semibold text-ink leading-relaxed">{s.address}</p>
                <p className="mt-2 text-xs text-ink-2 leading-relaxed">{s.notes}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-line/50 text-xs text-muted">
                <span className="mono-label text-[9px] text-muted block mb-0.5">HOURS OF OPERATION</span>
                <span>{s.hours}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Department Contacts */}
      <section className="mt-sec rounded-shell border border-line/60 bg-surface p-6 sm:p-8 shadow-soft">
        <div className="mb-6">
          <span className="mono-label text-accent font-bold">DIRECTORY</span>
          <h2 className="type-section mt-1">Department Contacts</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <div key={d.role} className="rounded-card border border-line/50 bg-tile p-5 shadow-xs">
              <h3 className="text-sm font-extrabold uppercase text-ink">{d.role}</h3>
              <p className="mt-1 text-xs text-ink-2 leading-relaxed">{d.desc}</p>
              <div className="mt-4 pt-3 border-t border-line/50 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-accent font-bold">
                  <Icon name="mail" className="size-3.5" />
                  <span>{d.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted font-medium">
                  <Icon name="phone" className="size-3.5" />
                  <span>{d.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Appointment & Fast Inquiry Action */}
      <section className="mt-sec mb-4 rounded-shell border border-line/60 bg-studio p-8 shadow-soft">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <span className="mono-label text-accent font-bold">DIGITAL SHOWROOM PREVIEW</span>
            <h2 className="text-2xl font-extrabold uppercase text-ink mt-1">
              Book a 1-on-1 virtual walkthrough
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">
              Unable to visit our New York or Montreal locations in person? Our accounts team can host a 20-minute private video walkthrough to present FW26 physical boots, leather swatches, and case pack curves.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <OpenInquiryButton className="btn btn-dark">
              Book Showroom Walkthrough <Icon name="arrow" />
            </OpenInquiryButton>
            <Link href="/catalog" className="text-xs font-bold text-accent hover:underline">
              Browse online wholesale catalog first →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
