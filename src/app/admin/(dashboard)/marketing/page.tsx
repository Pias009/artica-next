import type { Metadata } from "next";
import { Marketing } from "@/components/admin/views/Marketing";
import { requireAdmin } from "@/lib/admin/auth";
import { sendingBlockers } from "@/lib/marketing/send";
import { marketingData } from "@/lib/marketing/store";

export const metadata: Metadata = { title: "Marketing" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The marketing manager's desk: subscribers by priority, mail models, the mail schedule, inquiries and lists. */
export default async function MarketingPage({ searchParams }: Props) {
  await requireAdmin();
  const [data, sp] = await Promise.all([marketingData(), searchParams]);
  return <Marketing data={data} tab={typeof sp.tab === "string" ? sp.tab : "overview"} blockers={sendingBlockers()} />;
}
