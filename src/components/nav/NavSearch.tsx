"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Icon } from "../Icon";
import { filterProducts, inLine, LINE_LABEL, products, type Product, type ProductLine } from "@/lib/products";

const RECENT_KEY = "cl-recent-searches";
const POPULAR = ["Snow boot", "Chelsea", "Sandal", "Patent", "Loafer", "Insulated"];
const LINES: ProductLine[] = ["men", "women", "kids"];
const SHOWN = 6;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

function remember(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/** Name matches first (start of name before anywhere in it), then type, then everything else. */
function rank(q: string): Product[] {
  const score = (p: Product) => {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (p.type.toLowerCase().includes(q)) return 2;
    return 3;
  };
  return filterProducts(products, "all", q).sort((a, b) => score(a) - score(b));
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q);
  if (!q || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-brand-soft text-brand-deep">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Command-palette search: live results while typing, arrow keys + Enter, recent and popular searches when empty. */
export function NavSearch({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Only mounted after the visitor opens search, so reading storage here can't mismatch the server render.
  const [recent] = useState(readRecent);

  const q = query.trim().toLowerCase();
  const all = useMemo(() => (q ? rank(q) : []), [q]);
  const results = all.slice(0, SHOWN);

  const openProduct = (p: Product) => {
    remember(query.trim());
    router.push(`/products/${p.slug}`);
    onDone();
  };
  const openCatalog = () => {
    if (!q) return;
    remember(query.trim());
    router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
    onDone();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + dir + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) openProduct(results[active]);
      else openCatalog();
    }
  };

  const chip = "inline-flex h-9 items-center gap-1.5 rounded-full bg-chip px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-ink hover:text-white";

  return (
    <div className="p-3 sm:p-4">
      <div className="flex h-14 items-center gap-3 rounded-full bg-tile px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
        <Icon name="search" className="size-5 text-muted" />
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-label="Search styles"
          aria-expanded={results.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={results[active] ? `${id}-${results[active].id}` : undefined}
          aria-autocomplete="list"
          placeholder={`Search ${products.length} styles: name, colour, material…`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden rounded-md bg-white px-2 py-0.5 text-[12px] font-medium text-muted ring-1 ring-line sm:inline">Esc</kbd>
      </div>

      {q ? (
        <div className="px-2 pt-3 pb-1">
          {results.length ? (
            <>
              <ul id={`${id}-list`} role="listbox" aria-label="Matching styles" className="grid gap-1">
                {results.map((p, i) => (
                  <li
                    key={p.id}
                    id={`${id}-${p.id}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerMove={() => setActive(i)}
                    onClick={() => openProduct(p)}
                    className="flex cursor-pointer items-center gap-3 rounded-card p-2 aria-selected:bg-chip"
                  >
                    <span className="relative size-14 flex-none rounded-ph bg-tile">
                      <Image src={p.outer.src} alt="" fill sizes="56px" className="object-contain p-1.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        <Highlight text={p.name} q={q} />
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {p.type} · {LINE_LABEL[p.line]} · {p.color.name}
                      </span>
                    </span>
                    <Icon name="arrow" className={clsx("size-4 text-muted transition-opacity", i === active ? "opacity-100" : "opacity-0")} />
                  </li>
                ))}
              </ul>
              <button type="button" onClick={openCatalog} className="mt-2 flex w-full items-center justify-between rounded-card px-3 py-3 text-[14px] font-semibold hover:bg-chip">
                See all {all.length} {all.length === 1 ? "result" : "results"} in the catalog
                <Icon name="arrow" className="size-4" />
              </button>
            </>
          ) : (
            <p role="status" className="px-2 py-6 text-center text-[15px] text-muted">
              No styles match “{query.trim()}”. Try a type like <b className="text-ink">boot</b> or <b className="text-ink">sandal</b>, or a colour.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-5 px-2 pt-5 pb-2 sm:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-ink-2">{recent.length ? "Recent searches" : "Popular searches"}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {(recent.length ? recent : POPULAR).map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => setQuery(s)} className={chip}>
                    {recent.length > 0 && <Icon name="clock" className="size-3.5" />}
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink-2">Browse a line</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {LINES.map((l) => (
                <li key={l}>
                  <Link href={`/catalog?line=${l}`} onClick={onDone} className={chip}>
                    {LINE_LABEL[l]}
                    <span className="text-[12px] tabular-nums opacity-60">{inLine(l).length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
