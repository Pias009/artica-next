import type { Metadata } from "next";
import { headers } from "next/headers";
import { Pages } from "@/components/admin/views/Pages";
import { requireAdmin } from "@/lib/admin/auth";
import { editablePaths, pageBlocks, siteOrigin } from "@/lib/admin/page-blocks";

export const metadata: Metadata = { title: "Pages" };

/** Pages: reads each site page for its intro and headings here, so the panel's other sections don't wait on it. */
export default async function PagesPage() {
  await requireAdmin();
  const blocks = await pageBlocks(siteOrigin((await headers()).get("host")), editablePaths()).catch(() => ({}));
  return <Pages blocks={blocks} />;
}
