import type { Metadata } from "next";
import { Settings } from "@/components/admin/views/Settings";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  return <Settings />;
}
