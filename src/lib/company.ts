import type { IconName } from "@/components/Icon";
import { onLive } from "./content/live";

/**
 * One source of truth for company and contact details (footer, contact page, FAQ).
 * Email, phone and hours are client placeholders: replace them here before launch.
 */
export const COMPANY = {
  name: "Guangzhou Chime Long Trading Co., Ltd",
  email: {
    general: "wholesale@articafootwear.com",
    buyers: "buyers@articafootwear.com",
    oem: "oem@articafootwear.com",
    logistics: "logistics@articafootwear.com",
  },
  phone: "+1 (800) 412-8820",
  /** WhatsApp in international format, digits only (e.g. "8613800000000"). Empty hides every WhatsApp option. */
  whatsapp: "",
  hours: "Mon–Fri 9:00–18:00 EST",
};

const BUILT_IN = { email: COMPANY.email.general, phone: COMPANY.phone, hours: COMPANY.hours };

/** The trade desk's contact details from the admin panel's settings, in place (empty fields keep the built-in ones). */
export function applyContact(c: { email?: string; phone?: string; hours?: string }) {
  COMPANY.email.general = c.email?.trim() || BUILT_IN.email;
  COMPANY.phone = c.phone?.trim() || BUILT_IN.phone;
  COMPANY.hours = c.hours?.trim() || BUILT_IN.hours;
}
onLive((c) => applyContact(c.contact));

/** Social profiles. Only entries with a real URL are shown, so leave this empty until they exist. */
export const SOCIAL: { icon: IconName; label: string; href: string }[] = [];

export const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** A WhatsApp chat with the trade desk, with an opening line written for the buyer. Null until a number is set. */
export const whatsappLink = (text = "Hello, I'd like wholesale pricing for Chime Long footwear.") =>
  COMPANY.whatsapp ? `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : null;
