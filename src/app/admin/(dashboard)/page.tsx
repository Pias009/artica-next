import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { currentAdmin } from "@/lib/admin/auth";
import { panelData } from "@/lib/admin/panel";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The admin dashboard (src/components/admin/AdminPanel), full-screen, with the real data: site edits, inquiries,
 * visitors and Kai's activity (src/lib/admin/panel.ts). Signed-in admins only (or the dev skip where it's allowed);
 * every save is a server action that checks again.
 */
export default async function AdminHome() {
  const who = await currentAdmin().catch(() => null);
  if (!who) redirect("/admin/login");
  const data = await panelData();
  return <AdminPanel admin={{ name: who.admin.name, email: who.admin.email }} data={data} />;
}
