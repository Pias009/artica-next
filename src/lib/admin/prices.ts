/*
 * The desk's own prices: per style, the price per pair (USD, FOB) at each order size. Private: kept in the site
 * content document but never in the copy sent to browsers (content/model.ts publicContent), shown only in the admin
 * panel, reply drafts and quotes. Pure, so the panel and the server work them out the same way.
 */

export const TIERS = [
  { key: "t300", from: 300, label: "300+ pairs" },
  { key: "t600", from: 600, label: "600+ pairs" },
  { key: "t1000", from: 1000, label: "1,000+ pairs" },
] as const;
export type TierKey = (typeof TIERS)[number]["key"];
export type PriceRow = Partial<Record<TierKey, number>>;
export type PriceList = Record<string, PriceRow>;

/** The price per pair for an order of `pairs` of one style: the biggest tier reached that has a price, else a smaller one. */
export function priceFor(row: PriceRow | undefined, pairs: number): { price: number; tier: TierKey } | null {
  if (!row) return null;
  const reached = TIERS.filter((t) => pairs >= t.from || t.key === "t300");
  for (const t of [...reached].reverse()) if (row[t.key]) return { price: row[t.key]!, tier: t.key };
  for (const t of TIERS) if (row[t.key]) return { price: row[t.key]!, tier: t.key };
  return null;
}

export const hasPrice = (row: PriceRow | undefined) => !!row && TIERS.some((t) => row[t.key]);
export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** An inquiry's lines priced: each line's price per pair and total, the order total, and the lines with no price yet. */
export function quote<L extends { productId: string; name: string; pairs: number }>(lines: L[], prices: PriceList) {
  const rows = lines.map((l) => {
    const p = priceFor(prices[l.productId], l.pairs);
    return { ...l, price: p?.price ?? null, tier: p?.tier ?? null, total: p ? p.price * l.pairs : null };
  });
  const priced = rows.filter((r) => r.total !== null);
  return {
    rows,
    total: priced.reduce((a, r) => a + r.total!, 0),
    complete: priced.length === rows.length && rows.length > 0,
    missing: rows.filter((r) => r.total === null).map((r) => r.name),
  };
}
