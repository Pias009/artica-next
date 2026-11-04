import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home/HomePage";
import { loadContent } from "@/lib/content/store";
import { isSeason, SEASON_IDS } from "@/lib/season";

/**
 * One home page per season, built ahead of time; proxy.ts serves "/" from the visitor's. Other values are turned away
 * below, not with `dynamicParams = false`: that also answers 404 for these pages once a save in the admin panel has
 * expired them, which took the home page down.
 */
export function generateStaticParams() {
  return SEASON_IDS.map((season) => ({ season }));
}

// the same page as "/", so search engines index that address only. No robots tag here: "/" is served from this route,
// so a noindex would land on the home page too. proxy.ts sends noindex for /season/* requested directly instead.
export async function generateMetadata(): Promise<Metadata> {
  // the home page's search title and description, if written in the admin panel (Pages → Home)
  const edit = (await loadContent()).pages["/"];
  return {
    alternates: { canonical: "/" },
    ...(edit?.title && { title: { absolute: edit.title }, openGraph: { title: edit.title }, twitter: { title: edit.title } }),
    ...(edit?.description && { description: edit.description }),
  };
}

export default async function SeasonHome({ params }: PageProps<"/season/[season]">) {
  const { season } = await params;
  if (!isSeason(season)) notFound();
  const content = await loadContent();
  return <HomePage season={season} sections={content.pages["/"]?.sections} />;
}
