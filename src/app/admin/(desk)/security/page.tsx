import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { endOtherSessionsAction, endSessionAction } from "../../actions";
import { auditLog, requireAdmin, sessions } from "@/lib/admin/auth";
import { device, when } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Security" };

const ACTION: Record<string, string> = {
  sign_in: "Signed in",
  sign_in_failed: "Sign-in failed",
  sign_in_locked: "Sign-in locked (too many tries)",
  sign_in_skipped: "Skipped sign-in (dev)",
  sign_out: "Signed out",
  status: "Changed status",
  retry_emails: "Retried emails",
  end_session: "Ended a session",
  end_other_sessions: "Ended other sessions",
};

export default async function SecurityPage() {
  const { admin, session } = await requireAdmin();
  const [mine, log] = await Promise.all([
    sessions().find({ adminId: admin._id, expiresAt: { $gt: new Date() } }).sort({ lastSeenAt: -1 }).toArray(),
    auditLog().find({}).sort({ at: -1 }).limit(60).toArray(),
  ]);
  const others = mine.filter((s) => !s._id.equals(session._id));

  return (
    <>
      <h1 className="font-headline text-[30px] leading-tight font-semibold tracking-[-0.015em]">Security</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        Signed in as {admin.email}. Last sign-in {when(admin.lastLoginAt)}. Sessions end after 2 idle hours, or 12 hours in all.
      </p>

      <section className="mt-6 rounded-card bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-muted">Your sessions</h2>
          {others.length > 0 && (
            <form action={endOtherSessionsAction}>
              <button type="submit" className="btn btn-line">
                Sign out everywhere else
              </button>
            </form>
          )}
        </div>
        <ul className="grid gap-2">
          {mine.map((s) => {
            const current = s._id.equals(session._id);
            return (
              <li key={s._id.toHexString()} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 text-[13.5px] first:border-0 first:pt-0">
                <span>
                  <b className="font-semibold">{device(s.userAgent)}</b>
                  {current && <span className="ml-2 rounded-full bg-badge-new px-2 py-0.5 text-[11.5px] font-semibold">This browser</span>}
                  <span className="block text-[12.5px] text-muted">
                    {[s.country, s.ip].filter(Boolean).join(" · ") || "Unknown place"} · signed in {when(s.createdAt)} · active {when(s.lastSeenAt)}
                  </span>
                </span>
                {!current && (
                  <form action={endSessionAction}>
                    <input type="hidden" name="id" value={s._id.toHexString()} />
                    <button type="submit" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-danger hover:bg-blush">
                      Sign out
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 rounded-card bg-white p-5">
        <h2 className="mb-3 text-[13px] font-semibold text-muted">Recent activity, all admins</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <tbody>
              {log.map((e) => (
                <tr key={String(e._id)} className="border-t border-line first:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap text-muted tabular-nums">{when(e.at)}</td>
                  <td className={clsx("py-2 pr-4", e.action.startsWith("sign_in_") && "font-semibold text-danger")}>
                    {ACTION[e.action] ?? e.action}
                    {e.ref && (
                      <>
                        {" "}
                        <Link href={`/admin/inquiries/${e.ref}`} className="underline underline-offset-2">
                          {e.ref}
                        </Link>
                      </>
                    )}
                    {e.detail && e.action !== "end_session" && <span className="text-muted"> · {e.detail}</span>}
                  </td>
                  <td className="py-2 pr-4 break-all">{e.email}</td>
                  <td className="py-2 text-muted">{e.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
