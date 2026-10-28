"use client";

import { useState } from "react";
import { Card, CardHead, Field, SaveBar, Segmented, Toggle } from "../ui";
import { LEAD, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN } from "@/lib/products";

const INITIAL = {
  company: "Guangzhou Chime Long Trading Co., Ltd.",
  email: "wholesale@articafootwear.com",
  phone: "+1 (800) 412-8820",
  hours: "Mon–Fri 9:00–18:00 EST",
  moq: String(MOQ_PAIRS),
  pack: String(PACK),
  privateLabel: String(PRIVATE_LABEL_MIN),
  samples: LEAD.samples.replace("d", ""),
  bulk: LEAD.bulk.replace("d", ""),
  sea: "14–42",
  air: "3–7",
  road: "14–20",
  tone: "warm" as "plain" | "warm" | "formal",
  autoDraft: true,
  briefs: true,
  notifyNew: true,
  notifyOverdue: true,
  weekly: false,
};

/** The site's fixed facts (company, trade terms, transit times) and how the assistant and alerts behave. */
export function Settings() {
  const [saved, setSaved] = useState(INITIAL);
  const [s, setS] = useState(INITIAL);
  const set = <K extends keyof typeof INITIAL>(k: K) => (v: (typeof INITIAL)[K]) => setS((x) => ({ ...x, [k]: v }));
  const changes = (Object.keys(s) as (keyof typeof INITIAL)[]).filter((k) => s[k] !== saved[k]).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card i={0}>
        <CardHead title="Company" sub="Shown in the footer, contact page and every email" />
        <div className="mt-5 grid gap-4">
          <Field label="Company name" value={s.company} onChange={set("company")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trade desk email" value={s.email} onChange={set("email")} />
            <Field label="Phone" value={s.phone} onChange={set("phone")} />
          </div>
          <Field label="Opening hours" value={s.hours} onChange={set("hours")} />
        </div>
      </Card>

      <Card i={1}>
        <CardHead title="Trade terms" sub="Used across product pages, the FAQ and the planners" />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="MOQ (pairs)" value={s.moq} onChange={set("moq")} />
          <Field label="Pairs per case" value={s.pack} onChange={set("pack")} />
          <Field label="Private label MOQ" value={s.privateLabel} onChange={set("privateLabel")} />
          <Field label="Samples (days)" value={s.samples} onChange={set("samples")} />
          <Field label="Bulk run (days)" value={s.bulk} onChange={set("bulk")} />
        </div>
      </Card>

      <Card i={2}>
        <CardHead title="Transit times" sub="The Shipping page's sea, air and road routes" />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Sea (days at sea)" value={s.sea} onChange={set("sea")} />
          <Field label="Air (door to door)" value={s.air} onChange={set("air")} />
          <Field label="Road (to Europe)" value={s.road} onChange={set("road")} />
        </div>
      </Card>

      <Card i={3} tone="dark">
        <CardHead dark title="Assistant" sub="Drafts replies, suggests copy and writes the weekly brief" right={<span className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold">Demo mode</span>} />
        <div className="mt-5 grid gap-4 text-[13.5px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-white/80">Voice</span>
            <div className="rounded-full bg-white">
              <Segmented label="Assistant voice" value={s.tone} onChange={set("tone")} options={[{ id: "plain", label: "Plain" }, { id: "warm", label: "Warm" }, { id: "formal", label: "Formal" }]} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-white/80">
            Draft a reply for every new inquiry
            <Toggle dark label="Auto-draft replies" checked={s.autoDraft} onChange={set("autoDraft")} />
          </label>
          <label className="flex items-center justify-between gap-3 text-white/80">
            Morning brief on the dashboard
            <Toggle dark label="Morning brief" checked={s.briefs} onChange={set("briefs")} />
          </label>
        </div>
      </Card>

      <Card i={4} className="lg:col-span-2">
        <CardHead title="Alerts" sub="Emails to the trade desk" />
        <div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-3">
          {(
            [
              ["notifyNew", "Every new inquiry"],
              ["notifyOverdue", "No reply after 24 hours"],
              ["weekly", "Weekly summary"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3">
              {l}
              <Toggle label={l} checked={s[k]} onChange={set(k)} />
            </label>
          ))}
        </div>
      </Card>

      <SaveBar count={changes} onDiscard={() => setS(saved)} onSave={() => setSaved(s)} />
    </div>
  );
}
