/** The home page's sections, in their built-in order: what the admin panel's Pages view lists, shows, hides and reorders. */
export const HOME_SECTIONS = [
  { id: "hero", label: "Hero spotlight", kind: "Hero", copy: false, seasonal: true },
  { id: "season-pick", label: "Choose your season", kind: "Tool", copy: true },
  { id: "season-edit", label: "Season edit", kind: "Products", copy: true },
  { id: "hot", label: "Hot products", kind: "Products", copy: true },
  { id: "new", label: "New arrivals", kind: "Products", copy: true },
  { id: "campaign", label: "Campaign banner", kind: "Banner", copy: false, seasonal: true },
  { id: "styles", label: "Best sellers", kind: "Products", copy: true },
  { id: "up-close", label: "Up close", kind: "Story", copy: true },
  { id: "lookbook", label: "Lookbook", kind: "Banner", copy: true },
  { id: "programs", label: "Buyer programs", kind: "Story", copy: true },
  { id: "worn", label: "Worn in the city", kind: "Banner", copy: true },
  { id: "samples", label: "Sample request", kind: "Form", copy: true },
  { id: "order-sheet", label: "Order sheet", kind: "Tool", copy: true },
  { id: "when-to-order", label: "When to order", kind: "Tool", copy: true },
  { id: "business-plan", label: "Business planner", kind: "Tool", copy: true },
  { id: "packing", label: "How it ships", kind: "Story", copy: true },
  { id: "worldwide", label: "Global reach", kind: "Map", copy: true },
  { id: "journey", label: "Order journey", kind: "Story", copy: true },
  { id: "buyer-desk", label: "Buyer desk", kind: "Tool", copy: true },
  { id: "partner", label: "Private label", kind: "Story", copy: true },
  { id: "line-sheet", label: "Line sheet", kind: "Form", copy: true },
  { id: "reveal", label: "Closing reveal", kind: "Banner", copy: false },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/**
 * The sections in the admin's order with their visibility. Sections added to the site after the order was saved
 * join it shown, right after the section they follow on the built-in page (a new one after the hero stays there).
 */
export function homeOrder(edits?: { id: string; visible: boolean }[]) {
  const known = new Set<string>(HOME_SECTIONS.map((s) => s.id));
  const out = (edits ?? []).filter((e) => known.has(e.id)).map((e) => ({ id: e.id, visible: e.visible }));
  HOME_SECTIONS.forEach((s, i) => {
    if (out.some((e) => e.id === s.id)) return;
    const before = HOME_SECTIONS.slice(0, i).reverse().find((b) => out.some((e) => e.id === b.id));
    const at = before ? out.findIndex((e) => e.id === before.id) + 1 : 0;
    out.splice(at, 0, { id: s.id, visible: true });
  });
  return out as { id: HomeSectionId; visible: boolean }[];
}

/**
 * The footer's "Talk to the desk" box (components/DeskContact.tsx): on every page, its words kept once, with the home
 * page's (Pages → Home lists it after the sections; other pages leave it out).
 */
export const FOOTER_BLOCK = { id: "talk", label: "Footer: talk to the desk", kind: "Footer" } as const;
