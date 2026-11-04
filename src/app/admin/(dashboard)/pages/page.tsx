import type { Metadata } from "next";
import { Pages } from "@/components/admin/views/Pages";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage() {
  await requireAdmin();
  return <Pages />;
}
