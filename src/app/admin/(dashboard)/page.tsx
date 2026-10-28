import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The admin dashboard (src/components/admin/AdminPanel), full-screen. Like every admin page it checks the session in
 * the database first; the proxy's cookie check alone never decides.
 */
export default async function AdminHome() {
  const { admin } = await requireAdmin();
  return <AdminPanel admin={{ name: admin.name, email: admin.email }} />;
}
