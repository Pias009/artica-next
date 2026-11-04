import type { Metadata } from "next";
import { Visitors } from "@/components/admin/views/Visitors";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Visitors" };

export default async function VisitorsPage() {
  await requireAdmin();
  return <Visitors />;
}
