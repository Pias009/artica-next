import { Icon, type IconName } from "../Icon";

const ITEMS: [IconName, string, string][] = [
  ["truck", "Door to door", "US and Canada, DDP"],
  ["box", "12 pairs per case", "Mixed size runs"],
  ["shield", "Quality report", "With every shipment"],
  ["clock", "Reply in 24 hours", "Mon–Fri, EST"],
];

export function ServiceStrip() {
  return (
    <section
      id="service"
      aria-label="Service"
      className="mt-[26px] grid scroll-mt-6 grid-cols-1 gap-y-[18px] border-y border-line py-[18px] sm:grid-cols-2 lg:grid-cols-4"
    >
      {ITEMS.map(([icon, title, sub], i) => (
        <div
          key={title}
          className={
            "flex items-center gap-3.5 py-1 sm:px-3 lg:px-5 " +
            (i % 2 ? "sm:border-l sm:border-line " : "") +
            (i === 2 ? "lg:border-l lg:border-line" : "")
          }
        >
          <Icon name={icon} className="size-[26px] stroke-[1.3] text-ink-2" />
          <span>
            <b className="block text-[13px] font-bold">{title}</b>
            <span className="block text-xs text-muted">{sub}</span>
          </span>
        </div>
      ))}
    </section>
  );
}
