"use client";

import { useRef, useState } from "react";
import { EmptyResults } from "./EmptyResults";
import { FilterPills, SearchBox } from "./FilterControls";
import { ProductCard } from "./ProductCard";
import { Flip, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { filterProducts, products, type Filter } from "@/lib/products";

/** Catalog grid. Filtering animates cards to their new spots with GSAP Flip. */
export function CatalogView({ initialFilter, initialQuery }: { initialFilter: Filter; initialQuery: string }) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const list = filterProducts(products, filter, query);

  const update = (next: { filter?: Filter; query?: string }) => {
    if (gridRef.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(gridRef.current.querySelectorAll("[data-card]"));
    }
    const f = next.filter ?? filter;
    const q = next.query ?? query;
    if (next.filter) setFilter(next.filter);
    if (next.query !== undefined) setQuery(next.query);
    // Keep the URL shareable without triggering a server navigation.
    const params = new URLSearchParams();
    if (f !== "all") params.set("line", f);
    if (q.trim()) params.set("q", q.trim());
    window.history.replaceState(null, "", `/catalog${params.size ? `?${params}` : ""}`);
  };

  useGSAP(
    () => {
      const state = flipState.current;
      if (!state) return;
      flipState.current = null;
      Flip.from(state, {
        targets: gridRef.current!.querySelectorAll("[data-card]"),
        duration: 0.6,
        ease: "power3.inOut",
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" }),
      });
    },
    { dependencies: [filter, query], scope: gridRef },
  );

  return (
    <>
      <div className="grid items-center gap-3.5 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <SearchBox value={query} onChange={(q) => update({ query: q })} />
        <FilterPills value={filter} onChange={(f) => update({ filter: f })} />
      </div>
      <p className="mt-5 mb-3 text-[13px] text-muted" aria-live="polite">
        {list.length} style{list.length === 1 ? "" : "s"} · MOQ 300 pairs each · 12 pairs per case
      </p>
      <div ref={gridRef} className="relative grid grid-cols-1 gap-3.5 min-[26rem]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} sizes="(max-width: 864px) 50vw, (max-width: 1184px) 33vw, 300px" />
        ))}
        {!list.length && <EmptyResults onReset={() => update({ filter: "all", query: "" })} />}
      </div>
    </>
  );
}
