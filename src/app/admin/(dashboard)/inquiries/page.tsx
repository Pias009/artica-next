import type { Metadata } from "next";
import { Inquiries } from "@/components/admin/views/Inquiries";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Inquiries" };

/** The latest inquiries by stage. The full table, with its filters, is at /admin/inquiries/all. */
export default async function InquiriesPage() {
  await requireAdmin();
  return <Inquiries />;
}
