import type { IconName } from "@/components/Icon";

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
  hours: "Mon–Fri 9:00–18:00 EST",
};

/** Social profiles. Only entries with a real URL are shown, so leave this empty until they exist. */
export const SOCIAL: { icon: IconName; label: string; href: string }[] = [];

export const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
