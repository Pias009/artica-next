import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { adminReady, currentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The admin dashboard (src/components/admin/AdminPanel), full-screen. It opens without signing in: the panel shows
 * sample data and changes nothing on the site. The pages with real data (/admin/inquiries, /admin/security) and every
 * server action still check the session. A signed-in admin sees their name on the account menu.
 */
export default async function AdminHome() {
  const signedIn = adminReady() ? await currentAdmin().catch(() => null) : null;
  return <AdminPanel admin={signedIn ? { name: signedIn.admin.name, email: signedIn.admin.email } : undefined} />;
}
