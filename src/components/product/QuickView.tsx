"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { Badge } from "../ui/Badge";
import { CropImage } from "../ui/CropImage";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { byId, CASE_PACK, cropsFor, LEAD, LINE_LABEL, MOQ_PAIRS, PACK, type Product } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

/** The one product detail dialog every boot on the site opens. */
export function QuickView() {
  const id = useUI((s) => s.quickView);
  const close = useUI((s) => s.closeQuickView);
  const ref = useRef<HTMLDialogElement>(null);
  const p = id ? byId[id] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (id && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      document.body.style.overflow = "hidden";
    } else if (!id && d.open) {
      d.close();
    }
  }, [id]);

  useGSAP(
    () => {
      if (!id) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-qv-panel]", { y: 28, scale: 0.97, opacity: 0, duration: 0.45, ease: "power3.out" });
        gsap.from("[data-bar]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, ease: "power3.out", stagger: 0.06, delay: 0.15 });
      });
    },
    { dependencies: [id], scope: ref, revertOnUpdate: true },
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby="qv-title"
      onClose={() => {
        // "Request sample" closes this dialog and opens the drawer in one step; keep the drawer's scroll lock.
        if (!useUI.getState().drawerOpen) document.body.style.overflow = "";
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto max-h-[min(780px,92dvh)] outline-none w-[min(1080px,calc(100%-32px))] max-w-none overflow-visible bg-transparent p-0 text-ink backdrop:bg-[rgb(15_16_13/.45)] backdrop:backdrop-blur-[3px] max-md:mb-0 max-md:w-full max-md:max-h-[92dvh]"
    >
      {p && <Panel key={p.id} p={p} onClose={() => ref.current?.close()} />}
    </dialog>
  );
}

function Panel({ p, onClose }: { p: Product; onClose: () => void }) {
  const crops = cropsFor(p.id);
  const views = [
    { key: "outer", label: "Outer view" },
    ...(p.zip ? [{ key: "zip", label: "Zip view" }] : []),
    ...crops.map((c) => ({ key: c.id, label: c.label })),
  ];
  const [view, setView] = useState("outer");
  const crop = crops.find((c) => c.id === view);
  const inCart = useInCart(p.id);
  const toggle = useInquiry((s) => s.toggle);
  const openDrawer = useUI((s) => s.openDrawer);

  return (
    <div
      data-qv-panel
      className="relative grid max-h-[inherit] grid-cols-1 overflow-y-auto overscroll-contain rounded-shell bg-white shadow-drawer max-md:rounded-b-none md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:overflow-hidden"
    >
      <button
        type="button"
        data-autofocus
        onClick={onClose}
        aria-label="Close details"
        className="absolute top-4 right-4 z-[4] grid size-11 place-items-center rounded-full bg-white text-ink shadow-soft transition-colors hover:bg-chip"
      >
        <Icon name="close" className="size-4" />
      </button>

      {/* gallery */}
      <div className="relative flex flex-col gap-3 bg-tile p-4 md:p-6">
        <div className="absolute top-5 left-5 z-[2] flex items-center gap-2">
          <Badge badge={p.badge} />
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-ph md:aspect-auto md:min-h-[420px] md:flex-1">
          {crop ? (
            <CropImage crop={crop} aspect={1} className="absolute inset-0 rounded-ph" />
          ) : (
            <span className="absolute inset-[8%]">
              <Image
                key={view}
                src={view === "zip" && p.zip ? p.zip.src : p.outer.src}
                alt={view === "zip" ? `${p.name}, zip side view` : p.desc}
                fill
                sizes="(max-width: 864px) 90vw, 540px"
                className="-rotate-3 object-contain drop-shadow-boot"
              />
            </span>
          )}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Views">
          {views.map((v) => {
            const c = crops.find((x) => x.id === v.key);
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-label={v.label}
                aria-pressed={view === v.key}
                className={clsx(
                  "relative size-16 flex-none overflow-hidden rounded-xl border-2 bg-white transition-colors",
                  view === v.key ? "border-ink" : "border-transparent hover:border-ink/20",
                )}
              >
                {c ? (
                  <CropImage crop={c} aspect={1} className="absolute inset-0" />
                ) : (
                  <Image src={v.key === "zip" && p.zip ? p.zip.src : p.outer.src} alt="" fill sizes="64px" className="object-contain p-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* details */}
      <div className="relative flex flex-col gap-5 p-5 md:overflow-y-auto md:p-8">
        <div className="md:pr-12">
          <h2 id="qv-title" className="text-[clamp(28px,3vw,38px)] leading-tight font-semibold tracking-[-0.03em]">
            Chime Long {p.name}
          </h2>
          <p className="mt-1 text-[16px] text-ink-2">
            {p.type} · {LINE_LABEL[p.line]} · {p.sizes}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2.5">
          {[
            [String(MOQ_PAIRS), "Pairs MOQ"],
            [String(PACK), "Pairs / case"],
            [LEAD.bulk, "Lead time"],
          ].map(([v, k]) => (
            <div key={k} className="flex flex-col-reverse justify-end rounded-ph bg-tile px-4 py-3.5">
              <dt className="mt-0.5 text-[13px] text-muted">{k}</dt>
              <dd className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="qv-mat">
          <h3 id="qv-mat" className="mb-3 text-[15px] font-semibold">
            Materials
          </h3>
          <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {p.materials.map((m) => (
              <li key={m.label} className="flex items-center gap-2.5">
                <span className="grid size-9 flex-none place-items-center rounded-full bg-frost text-glacier">
                  <Icon name={m.icon} className="size-4" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[12.5px] text-muted">{m.label}</span>
                  <span className="block text-[14px] font-semibold">{m.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <CasePackChart p={p} />

        <div className="flex items-center gap-3 text-[13px]">
          <span className="size-6 rounded-full ring-2 ring-white ring-offset-1 ring-offset-line" style={{ background: p.color.hex }} />
          <span className="font-semibold">{p.color.name}</span>
          <span className="text-muted">· more on request</span>
        </div>

        <div className="mt-auto grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => toggle(p.id)} aria-pressed={inCart} className="btn btn-dark h-12">
            <Icon name={inCart ? "check" : "plus"} />
            {inCart ? "In inquiry list" : "Add to inquiry"}
          </button>
          <button type="button" onClick={() => openDrawer()} className="btn btn-ghost h-12">
            <Icon name="sample" />
            Request sample
          </button>
        </div>
        <Link href={`/products/${p.slug}`} onClick={onClose} className="-mt-2 self-start py-2 text-[14px] font-semibold text-ink underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink">
          Full product page →
        </Link>
      </div>
    </div>
  );
}

/** Pairs per size inside one case: a single-series bar chart, glacier on snow. */
function CasePackChart({ p }: { p: Product }) {
  const pack = CASE_PACK[p.line];
  const max = Math.max(...pack.map(([, n]) => n));
  return (
    <figure className="rounded-ph bg-tile p-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold">Case pack · {p.sizes}</span>
        <span className="text-xs text-muted">{PACK} pairs per case</span>
      </figcaption>
      <div className="mt-6 flex h-20 items-end gap-[2px] border-b border-ink/15" aria-hidden="true">
        {pack.map(([size, n]) => (
          <div key={size} className="group/bar relative flex h-full flex-1 items-end justify-center">
            <span
              className={clsx(
                "absolute -top-5 text-[11px] font-bold tabular-nums transition-opacity",
                n === max ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100",
              )}
              style={{ bottom: `calc(${(n / max) * 100}% + 4px)`, top: "auto" }}
            >
              {n}
            </span>
            <span data-bar className="block w-full max-w-7 rounded-t-[4px] bg-glacier" style={{ height: `${(n / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]" aria-hidden="true">
        {pack.map(([size]) => (
          <span key={size} className="flex-1 text-center text-[11px] font-semibold text-muted tabular-nums">
            {size}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Pairs per size in one case of {p.name}</caption>
        <thead>
          <tr>
            <th scope="col">Size</th>
            <th scope="col">Pairs</th>
          </tr>
        </thead>
        <tbody>
          {pack.map(([size, n]) => (
            <tr key={size}>
              <td>{size}</td>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
