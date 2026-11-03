import type { Status } from "@/lib/leads/db";

/** How the admin panel writes dates, ages and devices. Times are Guangzhou time: that's where the desk sits. */

const DATE = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Shanghai",
});
export const when = (d: Date | string | null | undefined) => (d ? DATE.format(new Date(d)) : "—");

/** "3 h", "2 d": how long ago, or how long it took between two times. */
export function span(from: Date | string, to: Date | string = new Date()) {
  const h = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}
export const hoursSince = (d: Date | string) => (Date.now() - new Date(d).getTime()) / 3_600_000;

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  replied: "Replied",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};
export const STATUS_TONE: Record<Status, string> = {
  new: "bg-brand-soft text-brand-deep",
  replied: "bg-badge-new text-ink",
  quoted: "bg-sand text-badge-hot-ink",
  won: "bg-sage text-ink",
  lost: "bg-stone text-ink-2",
  spam: "bg-blush text-danger",
};

/** "Chrome on macOS" from a user-agent string; enough to tell your own devices apart. */
export function device(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "A browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}
