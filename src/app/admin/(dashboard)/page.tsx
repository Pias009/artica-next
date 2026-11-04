import type { Metadata } from "next";
import { Overview } from "@/components/admin/views/Overview";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function OverviewPage() {
  await requireAdmin();
  return <Overview />;
}
