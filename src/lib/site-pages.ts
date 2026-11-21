import type { MetadataRoute } from "next";

type Page = {
  path: string;
  name: string;
  /** One line on what a buyer finds there, for llms.txt. */
  summary: string;
  section: "Shop" | "Wholesale terms" | "Buyer tools" | "Company" | "Legal";
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

/** Every indexable page outside the product pages, for the sitemap and llms.txt. Add a page here when it ships. */
export const SITE_PAGES: Page[] = [
  { path: "/", name: "Home", summary: "Factory-direct wholesale footwear: the current season's styles, terms and how ordering works.", section: "Shop", priority: 1, changeFrequency: "weekly" },
  { path: "/catalog", name: "Wholesale footwear catalog", summary: "Every style, filterable by line, category, colour and season.", section: "Shop", priority: 0.9, changeFrequency: "weekly" },
  { path: "/catalog?line=women", name: "Wholesale women's shoes and boots", summary: "Women's boots, loafers, pumps, flats, sneakers and sandals.", section: "Shop", priority: 0.8, changeFrequency: "weekly" },
  { path: "/catalog?line=men", name: "Wholesale men's boots", summary: "Men's leather and shearling winter boots.", section: "Shop", priority: 0.8, changeFrequency: "weekly" },
  { path: "/catalog?line=kids", name: "Wholesale kids' shoes and boots", summary: "Kids' snow boots, hikers and sneakers in youth sizes.", section: "Shop", priority: 0.8, changeFrequency: "weekly" },
  { path: "/catalog?line=waterproof", name: "Wholesale waterproof boots", summary: "Styles built to keep water out.", section: "Shop", priority: 0.7, changeFrequency: "weekly" },
  { path: "/private-label", name: "Private label and OEM footwear", summary: "Your own brand on our lasts and materials: process, options and minimums.", section: "Wholesale terms", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", name: "Wholesale buyer FAQ", summary: "MOQ, samples, payment terms, shipping and defects, answered.", section: "Wholesale terms", priority: 0.8, changeFrequency: "monthly" },
  { path: "/shipping", name: "Shipping and trade terms", summary: "DDP, FOB and EXW explained, with cartons, pallets and transit.", section: "Wholesale terms", priority: 0.7, changeFrequency: "monthly" },
  { path: "/ship-to", name: "Shipping by country", summary: "Port, transit time, trade terms and import rules for each market.", section: "Wholesale terms", priority: 0.7, changeFrequency: "monthly" },
  { path: "/buyer-desk", name: "Buyer desk", summary: "All the planning tools for a wholesale order in one place.", section: "Buyer tools", priority: 0.7, changeFrequency: "monthly" },
  { path: "/size-guide", name: "Shoe size guide", summary: "US, EU, UK and cm sizes for men, women and kids, and the sizes in each case.", section: "Buyer tools", priority: 0.6, changeFrequency: "yearly" },
  { path: "/business-plan", name: "Business planner", summary: "Plan a season from China: the order-by date for your market, what to buy, landed cost, margin and the cash it needs.", section: "Buyer tools", priority: 0.7, changeFrequency: "monthly" },
  { path: "/order-calendar", name: "Order calendar", summary: "When to request samples and confirm bulk so stock lands before the season.", section: "Buyer tools", priority: 0.6, changeFrequency: "monthly" },
  { path: "/container-planner", name: "Container planner", summary: "Cases to pairs, pallets, volume and the container that fits.", section: "Buyer tools", priority: 0.6, changeFrequency: "yearly" },
  { path: "/quality", name: "Quality and documents", summary: "How each order is checked and which test reports buyers can request.", section: "Company", priority: 0.6, changeFrequency: "monthly" },
  { path: "/verify", name: "Verify us", summary: "Ways to check the company before paying: registration, live tour, bank account, inspection.", section: "Company", priority: 0.6, changeFrequency: "monthly" },
  { path: "/meet", name: "Meet us", summary: "Factory tours by video or in Guangzhou, and trade shows.", section: "Company", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", name: "About Chime Long", summary: "Who makes the shoes, the materials and how they are tested.", section: "Company", priority: 0.5, changeFrequency: "yearly" },
  { path: "/send-inquiry", name: "Get your inquiry by email", summary: "Add an email and get the details of your wholesale inquiry: line sheet, tier pricing and sample timing.", section: "Company", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", name: "Contact", summary: "The trade desk for pricing, line sheets and samples.", section: "Company", priority: 0.5, changeFrequency: "yearly" },
  { path: "/terms", name: "Terms of trade", summary: "Terms for quotes, samples, orders, inspection, delivery and claims.", section: "Legal", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", name: "Privacy policy", summary: "What we collect from inquiries and sign-ups, and your rights.", section: "Legal", priority: 0.2, changeFrequency: "yearly" },
];
