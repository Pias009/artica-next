import { NavLink } from "./NavLink";
import { signOutAction } from "../actions";
import { requireAdmin } from "@/lib/admin/auth";
import { dbReady } from "@/lib/leads/db";

/**
 * The frame for the working pages (the real inquiries and security); the dashboard at /admin is full-screen. It
 * checks the session, but layouts don't run again on every navigation, so each page and action checks for itself too
 * (requireAdmin is cached per request, so that costs one lookup). These pages read the database: without one (a
 * preview opened with "Skip sign-in"), they say so instead of failing.
 */
export default async function DeskLayout({ children }: LayoutProps<"/admin">) {
  const { admin } = await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-5 px-4 sm:px-8">
          <span className="shrink-0 text-[15px] font-semibold tracking-[-0.01em]">
            Chime Long <span className="font-normal text-muted">· Inquiry desk</span>
          </span>
          <nav aria-label="Admin" className="flex gap-1">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/inquiries">Inquiries</NavLink>
            <NavLink href="/admin/security">Security</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[13px] text-ink-2 sm:inline" title={admin.email}>
              {admin.name || admin.email}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-2 hover:bg-chip hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
        {dbReady() ? (
          children
        ) : (
          <div className="rounded-card bg-white p-6 text-[14px] text-ink-2">
            <h1 className="font-headline text-[24px] font-semibold text-ink">No database on this deployment</h1>
            <p className="mt-2 max-w-[60ch]">
              Live inquiries come from MongoDB. Add <code>MONGODB_URI</code> to this deployment&rsquo;s environment variables, allow Vercel in Atlas (Network
              Access), and redeploy. Until then the dashboard has nothing to show or save.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
