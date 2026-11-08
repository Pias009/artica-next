import { notFound } from "next/navigation";
import { HomePage } from "@/components/home/HomePage";
import { loadContent } from "@/lib/content/store";
import { isSeason, SEASON_IDS } from "@/lib/season";

/**
 * The home page with every section in it, hidden ones too: what the admin panel reads for each section's words, photos
 * and styles (lib/admin/page-blocks.ts), so a hidden section stays editable. proxy.ts answers 404 to anyone else.
 */
export function generateStaticParams() {
  return SEASON_IDS.map((season) => ({ season }));
}

export const metadata = { robots: { index: false, follow: false } };

export default async function SeasonHomeAll({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  if (!isSeason(season)) notFound();
  const content = await loadContent();
  return <HomePage season={season} sections={content.pages["/"]?.sections} all />;
}
