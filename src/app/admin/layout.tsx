import type { Metadata } from "next";
import { skipped } from "@/lib/admin/auth";

/** The admin panel sits outside the public site's chrome: no header, drawer or season background, never indexed. */
export const metadata: Metadata = {
  title: { default: "Inquiry desk", template: "%s · Inquiry desk" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminRoot({ children }: LayoutProps<"/admin">) {
  const skip = await skipped();
  return (
    <div className="min-h-screen bg-tile">
      {/* so a skipped sign-in is never mistaken for the real thing */}
      {skip && (
        <p role="status" className="fixed bottom-3 left-3 z-50 rounded-full bg-[#b45309] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
          {skip === "local" ? "Local dev" : skip === "preview" ? "Preview" : "No database"} · sign-in skipped
        </p>
      )}
      {children}
    </div>
  );
}
