"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { EmptyResults } from "../product/EmptyResults";
import { FilterPills, SearchBox } from "../product/FilterControls";
import { ProductCard } from "../product/ProductCard";
import { gsap, MOTION_OK, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { filterProducts, products } from "@/lib/products";
import { useUI } from "@/lib/store";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { SectionHead } from "../ui/SectionHead";

/** Home page: search + filter pills driving the "Top reorders" rail. */
export function ProductFinder() {
  const filter = useUI((s) => s.railFilter);
  const setFilter = useUI((s) => s.setRailFilter);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const railRef = useRef<HTMLDivElement>(null);
  const list = filterProducts(products, filter, query);

  // Stagger cards in whenever the filtered set changes.
  const key = list.map((p) => p.id).join();
  const first = useRef(true);
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("[data-card]", { y: 18, autoAlpha: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 });
      });
    },
    { dependencies: [key], scope: railRef },
  );

  // Track whether the rail can scroll further in each direction.
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [key]);

  const scrollBy = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.6, behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <>
      <section aria-label="Find styles" className="mt-sec grid items-center gap-3.5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={() => router.push(`/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`)}
        />
        <FilterPills value={filter} onChange={setFilter} />
      </section>

      <section id="styles" aria-labelledby="h-styles" className="mt-sec scroll-mt-6">
        <SectionHead
          id="h-styles"
          title="Top"
          muted="reorders"
          right={
            <OpenInquiryButton className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
              Full line sheet <Icon name="arrow" />
            </OpenInquiryButton>
          }
        />
        <div className="relative">
          <div
            ref={railRef}
            id="rail"
            className="no-scrollbar grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col gap-3.5 overflow-x-auto pb-1 md:auto-cols-[calc((100%_-_3*14px)/3.4)] lg:auto-cols-[calc((100%_-_4*14px)/5)]"
          >
            {list.map((p) => (
              <ProductCard key={p.id} p={p} className="snap-start" />
            ))}
          </div>
          {!list.length && (
            <EmptyResults
              onReset={() => {
                setFilter("all");
                setQuery("");
              }}
            />
          )}
          {(["prev", "next"] as const).map((d) => {
            const atEdge = d === "prev" ? edges.start : edges.end;
            return (
              <button
                key={d}
                type="button"
                onClick={() => scrollBy(d === "prev" ? -1 : 1)}
                aria-label={d === "prev" ? "Previous styles" : "More styles"}
                aria-controls="rail"
                disabled={atEdge}
                className={clsx(
                  "absolute top-[34%] z-[3] hidden size-11 place-items-center rounded-full border border-line/60 bg-surface/90 backdrop-blur-md shadow-float transition-all duration-200 hover:scale-105 hover:bg-surface active:scale-95 md:grid",
                  d === "prev" ? "-left-4" : "-right-4",
                  atEdge && "pointer-events-none opacity-0",
                )}
              >
                <Icon name="arrow" className={d === "prev" ? "rotate-180" : undefined} />
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
