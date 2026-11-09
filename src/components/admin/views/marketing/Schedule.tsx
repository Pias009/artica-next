"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Card, CardHead, Field, Meter, Sheet } from "../../ui";
import { Btn, Empty, ErrorLine, Input, Pill, Select, toLocalInput, useAction, when } from "./bits";
import { campaignCommandAction, saveCampaignAction } from "@/app/admin/marketing-actions";
import { audienceLabel, audienceMatches, PRIORITIES, PRIORITY_LABEL, type Audience, type CampaignStatus, type Priority } from "@/lib/marketing/model";
import type { MarketingCampaign, MarketingData } from "@/lib/marketing/store";

type Draft = { id?: string; name: string; templateId: string; subject: string; audience: Audience; at: string };

const STATUS: Record<CampaignStatus, { label: string; tone: "soft" | "dark" | "ok" | "warn" | "bad" }> = {
  draft: { label: "Draft", tone: "soft" },
  scheduled: { label: "Scheduled", tone: "dark" },
  sending: { label: "Sending", tone: "warn" },
  sent: { label: "Sent", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "soft" },
  failed: { label: "Failed", tone: "bad" },
};
const GROUPS: { title: string; sub: string; statuses: CampaignStatus[] }[] = [
  { title: "Coming up", sub: "Scheduled and sending now", statuses: ["scheduled", "sending"] },
  { title: "Drafts", sub: "Not scheduled yet", statuses: ["draft"] },
  { title: "Needs a look", sub: "Stopped after errors", statuses: ["failed"] },
  { title: "Sent", sub: "Most recent first", statuses: ["sent"] },
  { title: "Cancelled", sub: "Stopped by hand", statuses: ["cancelled"] },
];

/** In an hour, on the hour: a sensible first time to suggest. */
const nextHour = () => {
  const d = new Date(Date.now() + 3_600_000);
  d.setMinutes(0, 0, 0);
  return toLocalInput(d.toISOString());
};

/** The mail schedule: campaigns made from a mail model, for an audience picked by priority and tag, sent at a time. */
export function Schedule({ data, preset, onPresetUsed, blockers }: { data: MarketingData; preset: string | null; onPresetUsed: () => void; blockers: string[] }) {
  const [draft, setDraft] = useState<Draft | null>(() =>
    preset ? { name: data.templates.find((t) => t.id === preset)?.name ?? "", templateId: preset, subject: "", audience: { priorities: [], tags: [] }, at: nextHour() } : null,
  );
  const act = useAction();
  const tplName = (id: string | null) => data.templates.find((t) => t.id === id)?.name ?? "Deleted mail model";
  const command = (c: MarketingCampaign, command: "cancel" | "send-now" | "retry" | "delete" | "duplicate", done: string) => act.run(() => campaignCommandAction({ id: c.id, command }), done);
  const open = (d: Draft | null) => {
    setDraft(d);
    if (!d) onPresetUsed();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Btn
          disabled={!data.templates.length}
          onClick={() => open({ name: "", templateId: data.templates[0]?.id ?? "", subject: "", audience: { priorities: [], tags: [] }, at: nextHour() })}
        >
          New campaign
        </Btn>
        {!data.templates.length && <span className="text-[12.5px] text-ink/55">Write a mail model first (the Mail models tab).</span>}
        <span className="ml-auto max-w-[520px] text-right text-[12px] text-ink/50">
          Scheduled campaigns go out within minutes of their time while the site has visitors, and at the latest with the daily run (00:30 UTC).
        </span>
      </div>
      <ErrorLine error={act.error} />

      {data.campaigns.length ? (
        GROUPS.map((g, gi) => {
          const list = data.campaigns.filter((c) => g.statuses.includes(c.status));
          if (!list.length) return null;
          if (g.title === "Coming up") list.sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
          return (
            <Card key={g.title} i={gi + 1}>
              <CardHead title={g.title} sub={g.sub} right={<Pill>{list.length}</Pill>} />
              <ul className="mt-4 grid gap-2">
                {list.map((c) => {
                  const pct = c.stats.targeted ? Math.round((c.stats.sent / c.stats.targeted) * 100) : 0;
                  return (
                    <li key={c.id} className="rounded-2xl bg-white/75 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[14.5px] font-semibold">{c.name}</span>
                            <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
                          </p>
                          <p className="mt-1 text-[12.5px] text-ink/60">
                            {tplName(c.templateId)} · “{c.subject}”
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-ink/60">
                            {audienceLabel(c.audience)} · {c.status === "sent" ? `sent ${when(c.sentAt)}` : c.scheduledAt ? when(c.scheduledAt) : "no time set"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(c.status === "draft" || c.status === "scheduled" || c.status === "cancelled") && (
                            <Btn
                              tone="light"
                              onClick={() =>
                                open({ id: c.id, name: c.name, templateId: c.templateId ?? "", subject: c.subject, audience: c.audience, at: toLocalInput(c.scheduledAt) || nextHour() })
                              }
                            >
                              Edit
                            </Btn>
                          )}
                          {(c.status === "draft" || c.status === "scheduled" || c.status === "cancelled") && (
                            <Btn disabled={act.pending || blockers.length > 0} onClick={() => command(c, "send-now", "Sending now.")}>
                              Send now
                            </Btn>
                          )}
                          {c.status === "failed" && (
                            <Btn disabled={act.pending || blockers.length > 0} onClick={() => command(c, "retry", "Retrying from where it stopped.")}>
                              Retry
                            </Btn>
                          )}
                          {(c.status === "scheduled" || c.status === "sending") && (
                            <Btn tone="light" disabled={act.pending} onClick={() => command(c, "cancel", "Cancelled.")}>
                              Cancel
                            </Btn>
                          )}
                          <Btn tone="ghost" disabled={act.pending} onClick={() => command(c, "duplicate", "Copied as a draft.")}>
                            Copy
                          </Btn>
                          {c.status !== "sending" && (
                            <Btn tone="ghost" disabled={act.pending} onClick={() => command(c, "delete", "Campaign deleted.")}>
                              Delete
                            </Btn>
                          )}
                        </div>
                      </div>
                      {(c.status === "sending" || c.status === "sent" || c.status === "failed" || (c.status === "cancelled" && c.stats.sent > 0)) && (
                        <div className="mt-3">
                          <Meter label={`${c.stats.sent.toLocaleString("en-US")} of ${c.stats.targeted.toLocaleString("en-US")} sent${c.stats.failed ? `, ${c.stats.failed} failed` : ""}`} value={pct} />
                        </div>
                      )}
                      {c.lastError && c.status !== "sent" && <p className="mt-2 text-[12px] font-medium break-words text-danger">Last error: {c.lastError}</p>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })
      ) : (
        <Empty>No campaigns yet. Pick a mail model, choose who gets it by priority and tag, and set a time.</Empty>
      )}

      <Editor key={draft?.id ?? (draft ? `new-${draft.templateId}` : "none")} draft={draft} data={data} onClose={() => open(null)} blockers={blockers} />
    </div>
  );
}

function Editor({ draft, data, onClose, blockers }: { draft: Draft | null; data: MarketingData; onClose: () => void; blockers: string[] }) {
  const [d, setD] = useState<Draft>(draft ?? { name: "", templateId: "", subject: "", audience: { priorities: [], tags: [] }, at: "" });
  const act = useAction();
  const tags = useMemo(() => [...new Set(data.subscribers.flatMap((s) => s.tags))].sort(), [data.subscribers]);
  const reach = useMemo(() => data.subscribers.filter((s) => audienceMatches(s, d.audience)), [data.subscribers, d.audience]);
  const tpl = data.templates.find((t) => t.id === d.templateId);
  const toggle = <K extends "priorities" | "tags">(k: K, v: Audience[K][number]) =>
    setD((x) => {
      const list = x.audience[k] as string[];
      return { ...x, audience: { ...x.audience, [k]: list.includes(v) ? list.filter((y) => y !== v) : [...list, v] } };
    });
  const save = (mode: "draft" | "schedule" | "now") =>
    act.run(
      () =>
        saveCampaignAction({
          id: d.id,
          name: d.name || tpl?.name || "Campaign",
          templateId: d.templateId,
          subject: d.subject.trim() || undefined,
          audience: d.audience,
          scheduledAt: d.at ? new Date(d.at).toISOString() : null,
          mode,
        }),
      mode === "draft" ? "Saved as a draft." : mode === "now" ? "Sending now. Progress shows here." : `Scheduled for ${when(new Date(d.at).toISOString())}.`,
      onClose,
    );

  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? "Edit campaign" : "New campaign"}>
      <div className="grid gap-4">
        <Field label="Campaign name (only you see it)" value={d.name} max={100} placeholder={tpl?.name} onChange={(v) => setD((x) => ({ ...x, name: v }))} />
        <Select label="Mail model" value={d.templateId} onChange={(v) => setD((x) => ({ ...x, templateId: v }))} options={data.templates.map((t) => ({ id: t.id, label: t.name }))} />
        <Field label="Subject line (empty: the mail model's)" value={d.subject} max={200} placeholder={tpl?.subject} onChange={(v) => setD((x) => ({ ...x, subject: v }))} />

        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Priority tiers (none picked: everyone)</p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p: Priority) => {
              const on = d.audience.priorities.includes(p);
              const n = data.subscribers.filter((s) => s.status === "subscribed" && s.priority === p).length;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle("priorities", p)}
                  className={clsx("min-h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition-colors", on ? "bg-ink text-white ring-ink" : "bg-white/80 ring-ink/10 hover:bg-white")}
                >
                  {PRIORITY_LABEL[p]} <span className={clsx("tabular-nums", on ? "text-white/60" : "text-ink/45")}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        {tags.length > 0 && (
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Tags (none picked: every tag)</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = d.audience.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("tags", t)}
                    className={clsx("min-h-8 rounded-full px-3 text-[12.5px] font-semibold ring-1 transition-colors", on ? "bg-ink text-white ring-ink" : "bg-white/80 ring-ink/10 hover:bg-white")}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-[13.5px]">
          <strong className="tabular-nums">{reach.length.toLocaleString("en-US")}</strong> {reach.length === 1 ? "subscriber" : "subscribers"} · {audienceLabel(d.audience)}
          {data.capped && <span className="block text-[12px] text-ink/50">Counted from the loaded list; the send counts the whole list.</span>}
        </p>

        <Input label="Send at (your time)" type="datetime-local" value={d.at} onChange={(v) => setD((x) => ({ ...x, at: v }))} />

        {blockers.length > 0 && <p className="text-[12.5px] text-ink/60">Drafts only for now: to send, set {blockers.join(" and ")}.</p>}
        <ErrorLine error={act.error} />
        <div className="flex flex-wrap gap-2">
          <Btn disabled={act.pending || !d.templateId || !d.at || blockers.length > 0} onClick={() => save("schedule")}>
            {act.pending ? "Saving…" : "Schedule"}
          </Btn>
          <Btn tone="light" disabled={act.pending || !d.templateId || blockers.length > 0} onClick={() => save("now")}>
            Send now
          </Btn>
          <Btn tone="ghost" disabled={act.pending || !d.templateId} onClick={() => save("draft")}>
            Save draft
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}
