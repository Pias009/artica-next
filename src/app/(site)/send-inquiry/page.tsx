import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { SendInquiry } from "@/components/inquiry/SendInquiry";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Get your inquiry by email",
  description: "Add your email and Chime Long sends you the details of your wholesale inquiry: line sheet, tier pricing and sample timing.",
  path: "/send-inquiry",
});

/** The short link for sending an inquiry: the floating button, the menus and the footer all point here. */
export default function SendInquiryPage() {
  return <SendInquiry />;
}
