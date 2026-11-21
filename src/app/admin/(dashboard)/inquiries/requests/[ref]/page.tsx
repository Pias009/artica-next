import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestResponse } from "@/components/admin/views/inquiries/RequestResponse";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Inquiry response" };

/** The response to one email request: products, prices and terms, then send (Inquiries → Email requests). */
export default async function RequestPage({ params }: PageProps<"/admin/inquiries/requests/[ref]">) {
  await requireAdmin();
  const { ref } = await params;
  if (!/^CL-\d{4}-\d{4,}$/.test(ref)) notFound();
  return <RequestResponse refId={ref} />;
}
