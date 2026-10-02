"use client";

import Link from "next/link";
import { useRef } from "react";
import { ProductCard } from "../product/ProductCard";
import { EmptyResults } from "../product/EmptyResults";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { FILTERS, filterProducts, products } from "@/lib/products";
import { useUI } from "@/lib/store";

/** Top reorders: quiet text tabs over a calm product grid (a swipe rail on phones). */
export function BestSellers() {
  const filter = useUI((s) => s.railFilter);
  const setFilter = useUI((s) => s.setRailFilter);
  const list = filterProducts(products, filter, "");
  const grid = useRef<HTMLDivElement>(null);
  const key = list.map((p) => p.id).join();
  const first = useRef(true);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-card]", { y: 22, opacity: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 });
      });
    },
    { dependencies: [key], scope: grid },
  );

  return (
    <section id="styles" aria-labelledby="h-styles" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-styles"
        title="Top reorders this season"
        sub="The styles our retail partners order again and again."
        right={
          <Link href="/catalog">
            <ArrowLink>View all styles</ArrowLink>
          </Link>
        }
      />

      <div role="group" aria-label="Filter styles" className="no-scrollbar -mx-(--shell-pad) mb-8 flex gap-1 overflow-x-auto px-(--shell-pad)">
        {[...FILTERS.filter((f) => f.id === "all"), ...FILTERS.filter((f) => f.id !== "all")].map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className="h-11 flex-none rounded-full px-5 text-[15px] font-medium whitespace-nowrap text-ink-2 transition-colors hover:bg-chip hover:text-ink aria-pressed:bg-ink aria-pressed:text-white"
          >
            {f.id === "all" ? "All" : f.label}
          </button>
        ))}
      </div>

      <div
        ref={grid}
        className="no-scrollbar -mx-(--shell-pad) grid snap-x snap-mandatory auto-cols-[70%] grid-flow-col gap-4 overflow-x-auto scroll-px-(--shell-pad) px-(--shell-pad) sm:auto-cols-[44%] md:mx-0 md:grid-flow-row md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5 lg:gap-5"
      >
        {list.map((p) => (
          <ProductCard key={p.id} p={p} className="snap-start" />
        ))}
      </div>
      {!list.length && <EmptyResults onReset={() => setFilter("all")} />}
    </section>
  );
}
