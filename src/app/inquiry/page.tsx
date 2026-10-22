import type { Metadata } from "next";
import { InquiryPanel } from "@/components/inquiry/InquiryForm";
import { PageIntro } from "@/components/PageIntro";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Inquiry list",
  description: "Review your styles and case quantities, then request the line sheet and wholesale pricing.",
  path: "/inquiry",
  noindex: true,
});

export default function InquiryPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Inquiry list" }]}
        title="Inquiry list"
        text="Set cases per style (minimum 25 cases, 300 pairs), then send once. Wholesale pricing within 24 hours."
      />
      <InquiryPanel variant="page" />
    </>
  );
}
