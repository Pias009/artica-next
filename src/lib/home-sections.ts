/** The home page's sections, in their built-in order: what the admin panel's Pages view lists, shows, hides and reorders. */
export const HOME_SECTIONS = [
  { id: "hero", label: "Hero spotlight", kind: "Hero", copy: false },
  { id: "season-edit", label: "Season edit", kind: "Products", copy: true },
  { id: "hot", label: "Hot products", kind: "Products", copy: false },
  { id: "new", label: "New arrivals", kind: "Products", copy: false },
  { id: "campaign", label: "Campaign banner", kind: "Banner", copy: false },
  { id: "styles", label: "Best sellers", kind: "Products", copy: true },
  { id: "up-close", label: "Up close", kind: "Story", copy: false },
  { id: "lookbook", label: "Lookbook", kind: "Banner", copy: false },
  { id: "programs", label: "Buyer programs", kind: "Story", copy: true },
  { id: "worn", label: "Worn in the city", kind: "Banner", copy: false },
  { id: "samples", label: "Sample request", kind: "Form", copy: true },
  { id: "order-sheet", label: "Order sheet", kind: "Tool", copy: true },
  { id: "when-to-order", label: "When to order", kind: "Tool", copy: true },
  { id: "business-plan", label: "Business planner", kind: "Tool", copy: true },
  { id: "packing", label: "How it ships", kind: "Story", copy: true },
  { id: "worldwide", label: "Global reach", kind: "Map", copy: false },
  { id: "journey", label: "Order journey", kind: "Story", copy: true },
  { id: "buyer-desk", label: "Buyer desk", kind: "Tool", copy: true },
  { id: "partner", label: "Private label", kind: "Story", copy: false },
  { id: "line-sheet", label: "Line sheet", kind: "Form", copy: false },
  { id: "reveal", label: "Closing reveal", kind: "Banner", copy: false },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/** The sections in the admin's order with their visibility; sections added to the site later are appended, shown. */
export function homeOrder(edits?: { id: string; visible: boolean }[]) {
  const known = new Set<string>(HOME_SECTIONS.map((s) => s.id));
  const listed = (edits ?? []).filter((e) => known.has(e.id));
  const rest = HOME_SECTIONS.filter((s) => !listed.some((e) => e.id === s.id)).map((s) => ({ id: s.id, visible: true }));
  return [...listed, ...rest] as { id: HomeSectionId; visible: boolean }[];
}
