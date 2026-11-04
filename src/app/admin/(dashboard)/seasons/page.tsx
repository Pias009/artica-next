import type { Metadata } from "next";
import { Seasons } from "@/components/admin/views/Seasons";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Seasons" };

export default async function SeasonsPage() {
  await requireAdmin();
  return <Seasons />;
}
