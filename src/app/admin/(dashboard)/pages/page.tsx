import type { Metadata } from "next";
import { headers } from "next/headers";
import { Pages } from "@/components/admin/views/Pages";
import type { Block } from "@/lib/admin/page-blocks";
import { requireAdmin } from "@/lib/admin/auth";
import { editablePaths, pageBlocks, siteOrigin } from "@/lib/admin/page-blocks";
import { readContent } from "@/lib/content/store";
import type { SeasonId } from "@/lib/season";

export const metadata: Metadata = { title: "Pages" };

/**
 * Pages: reads each site page for its intro and headings here, so the panel's other sections don't wait on it. The
 * home page is read from its copy with every section in (season/[season]/all), so hidden sections stay editable.
 */
export default async function PagesPage() {
  await requireAdmin();
  const season: SeasonId = await readContent().then((c) => c.seasons.fallback, () => "winter" as const);
  const home = `/season/${season}/all`;
  const read: Record<string, Block[] | null> = await pageBlocks(siteOrigin((await headers()).get("host")), [home, ...editablePaths()]).catch(() => ({}));
  const { [home]: homeBlocks = null, ...rest } = read;
  return <Pages blocks={{ "/": homeBlocks, ...rest }} season={season} />;
}
