import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { currentAdmin } from "@/lib/admin/auth";
import { panelData } from "@/lib/admin/panel";

/**
 * The frame of the panel's sections (src/components/admin/AdminPanel), full-screen, with the real data: site edits,
 * inquiries, visitors and Kai's activity (src/lib/admin/panel.ts). Layouts don't run again on every navigation, so each
 * page checks the session for itself too, and every save is a server action that checks again.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const who = await currentAdmin().catch(() => null);
  if (!who) redirect("/admin/login");
  const data = await panelData();
  return (
    <AdminPanel admin={{ name: who.admin.name, email: who.admin.email }} data={data}>
      {children}
    </AdminPanel>
  );
}
