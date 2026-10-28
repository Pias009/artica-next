"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin, sessions, signIn, signOut } from "@/lib/admin/auth";
import { retryEmails } from "@/lib/admin/inquiries";
import { isDeskStatus } from "@/lib/leads/desk";
import { setStatus } from "@/lib/leads/inquiries";

/*
 * The admin panel's server actions. A server action is a public endpoint whatever page shows its form, so each one
 * checks the session itself (requireAdmin) and validates every field; Next.js also refuses calls from other origins.
 */

export type SignInState = { error?: string };

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const result = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? "").slice(0, 200), String(form.get("code") ?? "").slice(0, 12));
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}

export async function signOutAction() {
  await signOut();
  redirect("/admin/login");
}

const REF = /^CL-\d{4}-\d{4,}$/;

export async function setStatusAction(form: FormData) {
  const { admin } = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  const status = String(form.get("status") ?? "");
  if (!REF.test(ref) || !isDeskStatus(status)) return;
  const done = await setStatus(ref, status);
  if (done) await audit({ adminId: admin._id, email: admin.email, action: "status", ref, detail: status });
  revalidatePath("/admin", "layout");
}

export async function retryEmailsAction(form: FormData) {
  const { admin } = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  if (!REF.test(ref)) return;
  const r = await retryEmails(ref);
  await audit({ adminId: admin._id, email: admin.email, action: "retry_emails", ref, detail: `sent ${r.sent}, failed ${r.failed}` });
  revalidatePath(`/admin/inquiries/${ref}`);
}

/** Ends one of your own sessions (another device, or a browser you forgot to sign out of). */
export async function endSessionAction(form: FormData) {
  const { admin, session } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!ObjectId.isValid(id) || id === session._id.toHexString()) return;
  const { deletedCount } = await sessions().deleteOne({ _id: new ObjectId(id), adminId: admin._id });
  if (deletedCount) await audit({ adminId: admin._id, email: admin.email, action: "end_session", detail: id });
  revalidatePath("/admin/security");
}

export async function endOtherSessionsAction() {
  const { admin, session } = await requireAdmin();
  const { deletedCount } = await sessions().deleteMany({ adminId: admin._id, _id: { $ne: session._id } });
  await audit({ adminId: admin._id, email: admin.email, action: "end_other_sessions", detail: `${deletedCount} ended` });
  revalidatePath("/admin/security");
}
