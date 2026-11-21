"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { usePanel, useSaver } from "../panel-data";
import { Card, CardHead, Field, SaveBar, Segmented, Toggle } from "../ui";
import { saveAssistantAction, saveSettingsAction } from "@/app/admin/content-actions";
import { MARKETS } from "@/lib/buyer-desk";
import { COMPANY } from "@/lib/company";
import type { PanelData } from "@/lib/admin/panel";
import type { SiteContent, Tone } from "@/lib/content/model";
import { LEAD, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN } from "@/lib/products";

type State = {
  contact: SiteContent["contact"];
  alerts: SiteContent["alerts"];
  tone: Tone;
};

/** A fact the site computes with: shown here, changed in code (it drives prices, planners and Kai). */
function Fixed({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/60 px-4 py-3">
      <p className="text-[12px] font-semibold text-ink/55">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * The outside services the site leans on, what stops working without each, and the environment variables that switch
 * it on. Only whether each is set comes from the server (PanelData.connections), never a value.
 */
const CONNECTIONS: { key: keyof PanelData["connections"]; name: string; why: string; vars: string }[] = [
  { key: "database", name: "Database", why: "Inquiries, edits from this panel, subscribers and the visitor log are stored here; without it nothing saves.", vars: "MONGODB_URI" },
  { key: "mail", name: "Email", why: "Inquiry alerts, buyer receipts and quotes. Without it nothing is emailed.", vars: "RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM" },
  { key: "deskLinks", name: "Desk links", why: "One-click status links in desk emails, and the links to each buyer's quote page.", vars: "DESK_SECRET (16+ characters)" },
  { key: "cron", name: "Daily job", why: "Retries for emails that failed, the overdue digest and quote follow-ups. Without it none of them run.", vars: "CRON_SECRET" },
  { key: "siteUrl", name: "Site address", why: "Correct links in emails; without it they may point at the wrong address.", vars: "NEXT_PUBLIC_SITE_URL" },
  { key: "segment", name: "Line-sheet list", why: "Optional: line-sheet signups join a Resend segment. Without it they're emailed to the desk instead.", vars: "RESEND_SEGMENT_ID" },
];

const sea = () => {
  const n = MARKETS.flatMap((m) => m.transit.match(/\d+/g)?.map(Number) ?? []);
  return n.length ? `${Math.min(...n)}–${Math.max(...n)} days` : "–";
};

/** The site's fixed facts (company, trade terms, transit times) and how the assistant and alerts behave. */
export function Settings() {
  const panel = usePanel();
  const init = useMemo<State>(
    () => ({
      contact: panel.content.contact,
      alerts: panel.content.alerts,
      tone: panel.content.assistant.tone,
    }),
    [panel],
  );
  const [saved, setSaved] = useState(init);
  const [s, setS] = useState(init);
  const saver = useSaver(async (v: State) => {
    const a = await saveSettingsAction({
      contact: v.contact,
      alerts: v.alerts,
    });
    if (!a.ok || v.tone === saved.tone) return a;
    return saveAssistantAction({ ...panel.content.assistant, tone: v.tone });
  }, setSaved);
  const contact = (k: keyof State["contact"]) => (v: string) => setS((x) => ({ ...x, contact: { ...x.contact, [k]: v } }));
  const alert = (k: keyof State["alerts"]) => (v: boolean) => setS((x) => ({ ...x, alerts: { ...x.alerts, [k]: v } }));
  const changes =
    (["email", "phone", "hours"] as const).filter((k) => (s.contact[k] ?? "") !== (saved.contact[k] ?? "")).length +
    (["notifyNew", "notifyOverdue", "weekly", "nudgeBuyers"] as const).filter((k) => s.alerts[k] !== saved.alerts[k]).length +
    Number(s.tone !== saved.tone);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card i={0}>
        <CardHead title="Company" sub="The trade desk's contact details: footer, contact page, FAQ and Kai" />
        <div className="mt-5 grid gap-4">
          <Fixed label="Company name" value={COMPANY.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trade desk email" value={s.contact.email ?? ""} placeholder="As built" onChange={contact("email")} />
            <Field label="Phone" value={s.contact.phone ?? ""} placeholder="As built" onChange={contact("phone")} />
          </div>
          <Field label="Opening hours" value={s.contact.hours ?? ""} placeholder="As built" onChange={contact("hours")} />
          <p className="text-[12px] text-ink/50">Empty fields keep the details the site was built with. Inquiry emails go to the inbox set in DESK_EMAIL.</p>
        </div>
      </Card>

      <Card i={1}>
        <CardHead title="Trade terms" sub="The numbers the site calculates with (set in code)" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Fixed label="MOQ" value={`${MOQ_PAIRS} pairs`} />
          <Fixed label="Pairs per case" value={String(PACK)} />
          <Fixed label="Private label from" value={`${PRIVATE_LABEL_MIN} pairs`} />
          <Fixed label="Samples" value={`${LEAD.samples.replace("d", "")} days`} />
          <Fixed label="Bulk run" value={`${LEAD.bulk.replace("d", "")} days`} />
          <Fixed label="Quote" value={`within ${LEAD.quote.replace("h", "")} h`} />
        </div>
        <p className="mt-3 text-[12px] text-ink/50">
          They drive case maths, the order calendar, the business planner and Kai, so they change with a release (src/lib/products.ts).
        </p>
      </Card>

      <Card i={2}>
        <CardHead title="Transit times" sub="Sea transit by market, from the shipping data" />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {MARKETS.map((m) => (
            <Fixed key={m.id} label={m.name} value={m.transit} />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink/50">Sea, all markets: {sea()}. Set in src/lib/buyer-desk.ts.</p>
      </Card>

      <Card i={3} tone="dark">
        <CardHead dark title="Assistant voice" sub="How Kai writes on the site, in both desks" />
        <div className="mt-5 grid gap-4 text-[13.5px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-white/80">Voice</span>
            <div className="rounded-full bg-white">
              <Segmented
                label="Assistant voice"
                value={s.tone}
                onChange={(v) => setS((x) => ({ ...x, tone: v }))}
                options={[
                  { id: "plain", label: "Plain" },
                  { id: "warm", label: "Warm" },
                  { id: "formal", label: "Formal" },
                ]}
              />
            </div>
          </div>
          <p className="text-white/60">Switch the desks and the AI model on or off in the AI agent view.</p>
        </div>
      </Card>

      <Card i={4} className="lg:col-span-2">
        <CardHead title="Alerts" sub="Emails to the trade desk" />
        <div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["notifyNew", "Every new inquiry"],
              ["notifyOverdue", "No reply after 20 hours (daily)"],
              ["weekly", "Weekly summary (Mondays)"],
              ["nudgeBuyers", "Nudge buyers who haven't answered a quote after 5 days"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3">
              {l}
              <Toggle label={l} checked={s.alerts[k]} onChange={alert(k)} />
            </label>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink/50">
          Quotes with no answer after 3 days are listed in the daily email either way. The nudge is one short, polite email per quote, sent by the daily job
          when email is set up; replies come to the desk inbox.
        </p>
      </Card>

      <Card i={5} className="lg:col-span-2">
        <CardHead title="Connections" sub="What's set on the server. Only whether each is set is shown, never the value." />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CONNECTIONS.map((c) => {
            const on = panel.connections[c.key];
            return (
              <li key={c.key} className="rounded-2xl bg-white/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold">{c.name}</p>
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
                      on ? "bg-[#2f8f5b]/12 text-[#1f6b45]" : "bg-[#b45309]/12 text-[#8a3b0a]",
                    )}
                  >
                    {on ? "Connected" : "Not set"}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink/60">{c.why}</p>
                <p className="mt-1 text-[12px] text-ink/50">
                  <code className="font-mono text-[11.5px] text-ink/70">{c.vars}</code>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] text-ink/50">
          Set them in Vercel → Settings → Environment Variables, then redeploy. .env.example in the code lists every one.
        </p>
      </Card>

      <SaveBar count={changes} pending={saver.pending} error={saver.error} onDiscard={() => (setS(saved), saver.clearError())} onSave={() => saver.save(s)} />
    </div>
  );
}
