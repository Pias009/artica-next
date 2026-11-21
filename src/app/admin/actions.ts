"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin, sessions, signIn, signOut } from "@/lib/admin/auth";
import { inquiryDetail, retryEmails } from "@/lib/admin/inquiries";
import { draftReply, type ReplyDraft } from "@/lib/assistant/reply";
import { REPLY_BODY_MAX, REPLY_SUBJECT_MAX } from "@/lib/admin/reply-templates";
import { dbReady, inquiries, type InquiryMessage, type Status } from "@/lib/leads/db";
import { isDeskStatus } from "@/lib/leads/desk";
import { setStatus } from "@/lib/leads/inquiries";
import { mailReady, sendMail } from "@/lib/leads/mail";
import { replyEmail, replySubject } from "@/lib/leads/reply-mail";

/*
 * The admin panel's server actions. A server action is a public endpoint whatever page shows its form, so each one
 * checks the session itself (requireAdmin) and validates every field; Next.js also refuses calls from other origins.
 */

export type SignInState = { error?: string };

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const result = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? "").slice(0, 200));
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
  if (done)
    await audit({
      adminId: admin._id,
      email: admin.email,
      action: "status",
      ref,
      detail: status,
    });
  revalidatePath("/admin", "layout");
}

export async function retryEmailsAction(form: FormData) {
  const { admin } = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  if (!REF.test(ref)) return;
  const r = await retryEmails(ref);
  await audit({
    adminId: admin._id,
    email: admin.email,
    action: "retry_emails",
    ref,
    detail: `sent ${r.sent}, failed ${r.failed}`,
  });
  revalidatePath(`/admin/inquiries/${ref}`);
}

/** Ends one of your own sessions (another device, or a browser you forgot to sign out of). */
export async function endSessionAction(form: FormData) {
  const { admin, session } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!ObjectId.isValid(id) || id === session._id.toHexString()) return;
  const { deletedCount } = await sessions().deleteOne({
    _id: new ObjectId(id),
    adminId: admin._id,
  });
  if (deletedCount)
    await audit({
      adminId: admin._id,
      email: admin.email,
      action: "end_session",
      detail: id,
    });
  revalidatePath("/admin/security");
}

export async function endOtherSessionsAction() {
  const { admin, session } = await requireAdmin();
  const { deletedCount } = await sessions().deleteMany({
    adminId: admin._id,
    _id: { $ne: session._id },
  });
  await audit({
    adminId: admin._id,
    email: admin.email,
    action: "end_other_sessions",
    detail: `${deletedCount} ended`,
  });
  revalidatePath("/admin/security");
}

/** "Draft a reply with Kai" on an inquiry: a first draft for the desk to check, price and send. */
export async function draftReplyAction(ref: string): Promise<ReplyDraft | null> {
  const { admin } = await requireAdmin();
  if (!REF.test(ref)) return null;
  const i = await inquiryDetail(ref);
  if (!i) return null;
  const draft = await draftReply(i);
  await audit({
    adminId: admin._id,
    email: admin.email,
    action: "reply_drafted",
    ref,
    detail: draft.source,
  });
  return draft;
}

/** A desk message as the panel shows it (dates as ISO strings, like PanelInquiry["messages"]). */
export type SentMessage = Omit<InquiryMessage, "at"> & { at: string };
export type ReplyResult = { ok: true; sent: boolean; message: SentMessage; status: Status } | { ok: false; error: string; message?: SentMessage };

/**
 * "Send reply" on an inquiry: emails the buyer from the desk's sender (Reply-To the desk inbox, so their answer reaches
 * everyone) and keeps the reply on the inquiry's conversation. The message is kept even when sending fails, with the
 * reason, so nothing the desk typed is lost; it can be copied or sent again from the panel.
 */
export async function sendReplyAction(ref: string, subject: string, body: string): Promise<ReplyResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return { ok: false, error: "No database is connected." };
  if (typeof ref !== "string" || !REF.test(ref)) return { ok: false, error: "Unknown inquiry." };
  const subj = typeof subject === "string" ? subject.trim() : "";
  const text = typeof body === "string" ? body.trim() : "";
  if (!subj || subj.length > REPLY_SUBJECT_MAX) return { ok: false, error: `Give the reply a subject (up to ${REPLY_SUBJECT_MAX} characters).` };
  if (!text || text.length > REPLY_BODY_MAX) return { ok: false, error: `Write the reply first (up to ${REPLY_BODY_MAX.toLocaleString("en-US")} characters).` };

  const doc = await inquiries().findOne({ ref }, { projection: { email: 1, status: 1 } });
  if (!doc) return { ok: false, error: "That inquiry wasn't found." };

  const now = new Date();
  const sentSubject = replySubject(ref, subj);
  const ready = mailReady();
  const error = ready
    ? // a new key per send: a deliberate resend goes out, a retried request within the same millisecond does not
      await sendMail({ ...replyEmail({ ref, email: doc.email }, { subject: sentSubject, body: text }), idempotencyKey: `${ref}-reply-${now.getTime()}` })
    : "Email isn't connected (RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM)";

  const message: InquiryMessage = { from: "desk", by: admin.email, subject: sentSubject, body: text, at: now, error };
  // newest last, and only the latest 200 kept so a long thread can't grow the document without bound
  await inquiries().updateOne({ ref }, { $push: { messages: { $each: [message], $slice: -200 } } });
  const shown: SentMessage = { ...message, at: now.toISOString() };

  if (error) {
    await audit({ adminId: admin._id, email: admin.email, action: "reply_failed", ref, detail: error.slice(0, 200) });
    revalidatePath("/admin", "layout");
    return {
      ok: false,
      message: shown,
      error: ready
        ? `Saved on the inquiry, but the email didn't go out: ${error.slice(0, 140)}`
        : "Saved on the inquiry, but not sent: email delivery isn't connected yet (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM).",
    };
  }

  // the first reply moves a new inquiry on (and stamps firstReplyAt); later stages are the desk's own call
  const status = doc.status === "new" ? ((await setStatus(ref, "replied"))?.status ?? "replied") : doc.status;
  await audit({ adminId: admin._id, email: admin.email, action: "reply_sent", ref, detail: `to ${doc.email}: ${sentSubject}`.slice(0, 200) });
  revalidatePath("/admin", "layout");
  return { ok: true, sent: true, message: shown, status };
}
