import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";
import { adminReady, currentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-card bg-white p-7 shadow-[0_1px_2px_rgb(18_20_22/0.06),0_12px_32px_rgb(18_20_22/0.06)] sm:p-8">
        <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">Chime Long</p>
        <h1 className="mt-1.5 font-headline text-[28px] leading-tight font-semibold tracking-[-0.015em]">Inquiry desk</h1>
        <p className="mt-1.5 text-[14px] text-ink-2">Sign in with your password and the code from your authenticator app.</p>
        {adminReady() ? (
          <SignInForm />
        ) : (
          <p role="alert" className="mt-6 rounded-[12px] bg-blush px-4 py-3 text-[13.5px] text-danger">
            The admin panel isn&rsquo;t set up on this server yet: it needs MONGODB_URI and ADMIN_ENC_KEY (see README).
          </p>
        )}
      </div>
    </main>
  );
}
