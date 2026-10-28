import type { Metadata } from "next";
import { bypassed } from "@/lib/admin/auth";
import { openUntil } from "@/lib/admin/cookie";

/** The admin panel sits outside the public site's chrome: no header, drawer or season background, never indexed. */
export const metadata: Metadata = {
  title: { default: "Inquiry desk", template: "%s · Inquiry desk" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminRoot({ children }: LayoutProps<"/admin">) {
  const skipped = await bypassed();
  const until = openUntil();
  return (
    <div className="min-h-screen bg-tile">
      {/* so skipping sign-in is never mistaken for the real thing */}
      {skipped && (
        <p role="status" className="fixed bottom-3 left-3 z-50 rounded-full bg-[#b45309] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
          {skipped === "local"
            ? "Local dev · sign-in skipped (ADMIN_DEV_BYPASS)"
            : `Open access · anyone with this link can see inquiries · sign-in returns after ${until?.toISOString().slice(0, 10)} UTC`}
        </p>
      )}
      {children}
    </div>
  );
}
