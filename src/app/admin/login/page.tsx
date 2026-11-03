import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";
import { skipSignInAction } from "../actions";
import { adminReady, currentAdmin, skipMode } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await currentAdmin()) redirect("/admin");
  const ready = adminReady();
  const skip = await skipMode();
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-card bg-white p-7 shadow-[0_1px_2px_rgb(18_20_22/0.06),0_12px_32px_rgb(18_20_22/0.06)] sm:p-8">
        <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">Chime Long</p>
        <h1 className="mt-1.5 font-headline text-[28px] leading-tight font-semibold tracking-[-0.015em]">Inquiry desk</h1>
        {ready ? (
          <>
            <p className="mt-1.5 text-[14px] text-ink-2">Sign in with your password and the code from your authenticator app.</p>
            <SignInForm />
          </>
        ) : (
          !skip && (
            <p role="alert" className="mt-6 rounded-[12px] bg-blush px-4 py-3 text-[13.5px] text-danger">
              The admin panel isn&rsquo;t set up on this server yet: it needs MONGODB_URI and ADMIN_ENC_KEY (see README).
            </p>
          )
        )}

        {/* local dev, Vercel previews, and deployments with no database yet; never where real inquiries live (cookie.ts) */}
        {skip && (
          <form action={skipSignInAction} className={ready ? "mt-5 border-t border-line pt-5" : "mt-6"}>
            <button type="submit" className="btn h-[48px] w-full bg-[#b45309] text-white hover:bg-[#92400e]">
              Skip sign-in (dev)
            </button>
            <p className="mt-2 text-center text-[12px] text-muted">
              {skip === "local"
                ? "Only on this computer."
                : skip === "preview"
                  ? "Only on Vercel preview links."
                  : "Only while this deployment has no database: there's nothing to show or save yet. Once MONGODB_URI is set here, sign-in is required."}
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
