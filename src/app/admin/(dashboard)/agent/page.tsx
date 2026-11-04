import type { Metadata } from "next";
import { Agent } from "@/components/admin/views/Agent";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "AI agent" };

export default async function AgentPage() {
  await requireAdmin();
  return <Agent />;
}
