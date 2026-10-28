import { SiteChrome } from "@/components/SiteChrome";

/** The public site: every page between the header and the footer, with the inquiry drawer and dialogs. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteChrome>{children}</SiteChrome>;
}
