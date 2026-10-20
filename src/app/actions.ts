"use server";

import { byId, MOQ_CASES, PACK } from "@/lib/products";

export type InquiryResult =
  | { status: "idle" }
  | { status: "error"; errors: { company?: string; email?: string; form?: string } }
  | { status: "success"; summary: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitInquiry(_prev: InquiryResult, formData: FormData): Promise<InquiryResult> {
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const country = String(formData.get("country") ?? "Not given");
  const buyerType = String(formData.get("type") ?? "Retailer");
  const note = String(formData.get("note") ?? "").trim();

  const errors: { company?: string; email?: string } = {};
  if (!company) errors.company = "Enter your store or company name.";
  if (!EMAIL.test(email)) errors.email = "Enter a valid work email.";
  if (errors.company || errors.email) return { status: "error", errors };

  let lines: { id: string; cases: number }[] = [];
  try {
    lines = (JSON.parse(String(formData.get("lines") ?? "[]")) as { id: string; cases: number }[]).filter(
      (l) => byId[l.id] && Number.isInteger(l.cases) && l.cases >= MOQ_CASES,
    );
  } catch {
    return { status: "error", errors: { form: "Your inquiry list could not be read. Please try again." } };
  }

  const pairs = lines.reduce((a, l) => a + l.cases * PACK, 0);

  // Demo: connect this to your inbox, CRM or ERP (Resend, HubSpot, a database…).
  console.info("[inquiry]", { company, email, country, buyerType, note, lines, pairs });

  const summary = lines.length
    ? `${company}: ${lines.length} style${lines.length > 1 ? "s" : ""}, ${pairs.toLocaleString("en-US")} pairs to ${country}. Line sheet and tier pricing go to ${email}.`
    : `${company}: full line sheet and tier pricing go to ${email}.`;

  return { status: "success", summary };
}
