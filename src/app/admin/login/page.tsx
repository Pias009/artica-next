import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";
import { currentAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-card bg-white p-7 shadow-[0_1px_2px_rgb(18_20_22/0.06),0_12px_32px_rgb(18_20_22/0.06)] sm:p-8">
        <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">Chime Long</p>
        <h1 className="mt-1.5 font-headline text-[28px] leading-tight font-semibold tracking-[-0.015em]">Admin sign in</h1>
        <SignInForm />
      </div>
    </main>
  );
}
