import type { Metadata } from "next";
import { Social } from "@/components/admin/views/Social";
import { requireAdmin } from "@/lib/admin/auth";
import { socialData } from "@/lib/marketing/store";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Social & ads" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The social media marketing team: tracking tags and analytics, the ideas board, the content calendar, channel links. */
export default async function SocialPage({ searchParams }: Props) {
  const who = await requireAdmin();
  const [data, sp] = await Promise.all([socialData(), searchParams]);
  return (
    <Social
      data={data}
      tab={typeof sp.tab === "string" ? sp.tab : "tracking"}
      admin={who.admin.name.split(/\s+/)[0] || who.admin.email.split("@")[0]}
      site={absoluteUrl("/catalog")}
    />
  );
}
