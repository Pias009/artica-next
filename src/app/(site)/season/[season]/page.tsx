import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home/HomePage";
import { isSeason, SEASON_IDS } from "@/lib/season";

/** One home page per season, built ahead of time; proxy.ts serves "/" from the visitor's. */
export function generateStaticParams() {
  return SEASON_IDS.map((season) => ({ season }));
}
export const dynamicParams = false;

// the same page as "/", so search engines index that address only. No robots tag here: "/" is served from this route,
// so a noindex would land on the home page too. proxy.ts sends noindex for /season/* requested directly instead.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function SeasonHome({ params }: PageProps<"/season/[season]">) {
  const { season } = await params;
  if (!isSeason(season)) notFound();
  return <HomePage season={season} />;
}
