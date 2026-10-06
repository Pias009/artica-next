"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { byId, categoryOf, groupOf } from "@/lib/products";
import { useUI } from "@/lib/store";

/**
 * Every style in this one's category (same kind of shoe, same line) as photo swatches.
 * On the product page each one is a link; in Quick View (`inDialog`) it swaps the dialog in place.
 */
export function VersionPicker({ id, inDialog = false }: { id: string; inDialog?: boolean }) {
  const openQuickView = useUI((s) => s.openQuickView);
  const p = byId[id];
  const group = groupOf(p);
  if (group.length < 2) return null;

  return (
    <div>
      <h2 className="mb-2.5 text-[15px] font-semibold">
        {group.length} {categoryOf(p).toLowerCase()} <span className="font-normal text-muted">· viewing {p.name}, {p.color.name.toLowerCase()}</span>
      </h2>
      <ul className="flex flex-wrap gap-2.5">
        {group.map((v) => {
          const on = v.id === p.id;
          const body = (
            <>
              <span
                className={clsx(
                  "relative block size-[76px] overflow-hidden rounded-ph border-2 bg-tile transition-colors",
                  on ? "border-ink" : "border-transparent group-hover:border-ink/25",
                )}
              >
                <Image src={v.outer.src} alt="" fill sizes="76px" className="object-contain p-2 transition-transform duration-300 ease-soft group-hover:scale-105" />
              </span>
              <span className={clsx("mt-1.5 flex max-w-[76px] items-center gap-1.5 text-[12px] leading-tight", on ? "font-semibold text-ink" : "text-ink-2")}>
                <span className="size-2.5 flex-none rounded-full inset-ring inset-ring-ink/15" style={{ background: v.color.hex }} />
                <span className="truncate">{v.name}</span>
              </span>
            </>
          );
          const label = `${v.name}, ${v.color.name}`;
          return (
            <li key={v.id}>
              {inDialog ? (
                <button type="button" aria-pressed={on} aria-label={label} onClick={() => openQuickView(v.id)} className="group block text-left">
                  {body}
                </button>
              ) : (
                <Link href={`/products/${v.slug}`} scroll={false} aria-current={on ? "page" : undefined} aria-label={label} className="group block">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
