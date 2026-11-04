import type { Metadata } from "next";

/** The admin panel sits outside the public site's chrome: no header, drawer or season background, never indexed. */
export const metadata: Metadata = {
  title: { default: "Inquiry desk", template: "%s · Inquiry desk" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-screen bg-tile">{children}</div>;
}
