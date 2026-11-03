import { loadContent } from "@/lib/content/store";
import { lc } from "@/lib/product-copy";
import { categoryOf, LEAD, LINE_LABEL, MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN, products, type ProductLine } from "@/lib/products";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { SITE_PAGES } from "@/lib/site-pages";

// built once, then refreshed hourly so the admin panel's product edits reach it
export const revalidate = 3600;

const LINES: ProductLine[] = ["women", "men", "kids"];
const SECTIONS = ["Shop", "Wholesale terms", "Buyer tools", "Company", "Legal"] as const;
const link = (name: string, path: string, note?: string) => `- [${name}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

/**
 * llms.txt (llmstxt.org): the site in plain Markdown for AI assistants and answer engines, so a buyer asking one about
 * wholesale footwear gets our terms and styles right. Built from the same constants the pages use.
 */
export async function GET() {
  await loadContent();
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> Factory-direct wholesale footwear from Guangzhou, China, for retailers, distributors and private-label brands worldwide: boots, sneakers, loafers, pumps and sandals for women, men and kids. ${products.length} styles, sold by the case.`,
    "",
    "## Wholesale terms",
    "",
    `- Minimum order: ${MOQ_PAIRS} pairs per style (${MOQ_CASES} cases of ${PACK} pairs)`,
    `- Private label: from ${PRIVATE_LABEL_MIN} pairs per style`,
    `- Case pack: ${PACK} pairs per case in a set size run`,
    `- Quotes within ${LEAD.quote}; samples in ${parseInt(LEAD.samples, 10)} days; bulk production about ${parseInt(LEAD.bulk, 10)} days; delivery about ${parseInt(LEAD.delivery, 10)} days`,
    "- Ships worldwide on DDP, FOB or EXW terms",
    "",
    ...SECTIONS.flatMap((s) => [`## ${s}`, "", ...SITE_PAGES.filter((p) => p.section === s).map((p) => link(p.name, p.path, p.summary)), ""]),
    ...LINES.flatMap((line) => [
      `## ${LINE_LABEL[line]}'s styles`,
      "",
      ...products.filter((p) => p.line === line).map((p) => link(`${p.name} ${lc(p.type)}`, `/products/${p.slug}`, `${categoryOf(p)}, ${p.color.name.toLowerCase()}, ${p.sizes}`)),
      "",
    ]),
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
