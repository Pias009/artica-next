"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ago, usePanel } from "../panel-data";
import { intentLabel, PIPELINE } from "../data";
import { AdminIcon, Card, CardHead, LineChart, Meter } from "../ui";
import { Btn, Empty, ErrorLine, Pill, Stat, Tabs, useAction, useTab, when } from "./marketing/bits";
import { Schedule } from "./marketing/Schedule";
import { Subscribers } from "./marketing/Subscribers";
import { Templates } from "./marketing/Templates";
import { importBuyersAction } from "@/app/admin/marketing-actions";
import { PRIORITIES, PRIORITY_LABEL, SOURCE_LABEL, SOURCES, type Priority } from "@/lib/marketing/model";
import type { MarketingData } from "@/lib/marketing/store";

/*
 * The marketing manager's desk: the subscriber list with its priority-tiered ids, the mail models, the mail schedule,
 * and the inquiries and lists they come from. Data from lib/marketing/store.ts (read by the page), saves through
 * app/admin/marketing-actions.ts, emails through lib/marketing/send.ts.
 */

const TABS = ["overview", "subscribers", "models", "schedule", "inquiries"] as const;
type Tab = (typeof TABS)[number];

export function Marketing({ data, tab: initial, blockers }: { data: MarketingData | null; tab: string; blockers: string[] }) {
  const [tab, setTab] = useTab<Tab>(initial as Tab, TABS);
  const [preset, setPreset] = useState<string | null>(null);

  if (!data)
    return (
      <Card>
        <Empty>No database connected (MONGODB_URI): the subscriber list, mail models and schedule are kept there.</Empty>
      </Card>
    );

  const active = data.subscribers.filter((s) => s.status === "subscribed").length;
  const upcoming = data.campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length;

  return (
    <div className="grid gap-4">
      <Tabs
        label="Marketing sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: "overview", label: "Overview" },
          { id: "subscribers", label: "Subscribers", n: active },
          { id: "models", label: "Mail models", n: data.templates.length },
          { id: "schedule", label: "Schedule", n: upcoming },
          { id: "inquiries", label: "Inquiries & lists", n: data.buyers.length || undefined },
        ]}
      />
      {blockers.length > 0 && (
        <p role="status" className="rounded-3xl bg-[#c98a1b]/[0.14] px-5 py-3 text-[13px] text-[#6b4700]">
          <strong>Email isn&apos;t set up yet.</strong> You can build the list, write mail models and save drafts. To send, set {blockers.join(", ")} in the environment.
        </p>
      )}

      {tab === "overview" && <Overview data={data} go={setTab} blockers={blockers} />}
      {tab === "subscribers" && <Subscribers data={data} />}
      {tab === "models" && (
        <Templates
          templates={data.templates}
          canSend={!blockers.length}
          onUse={(id) => {
            setPreset(id);
            setTab("schedule");
          }}
        />
      )}
      {tab === "schedule" && <Schedule key={preset ?? "list"} data={data} preset={preset} onPresetUsed={() => setPreset(null)} blockers={blockers} />}
      {tab === "inquiries" && <InquiriesAndLists data={data} />}
    </div>
  );
}

/** The overview's figures: the list now, and over the last 30 days. */
function overviewFigures(data: MarketingData, now = Date.now()) {
  const subs = data.subscribers;
  const active = subs.filter((s) => s.status === "subscribed");
  const month = now - 30 * 86_400_000;
  const m = new Map<string, number>();
  for (const s of active) if (s.country) m.set(s.country, (m.get(s.country) ?? 0) + 1);
  return {
    active,
    fresh: subs.filter((s) => new Date(s.createdAt).getTime() >= month).length,
    left: subs.filter((s) => s.status === "unsubscribed").length,
    top: active.filter((s) => s.priority === "vip" || s.priority === "high").length,
    sent30: data.campaigns.filter((c) => c.sentAt && new Date(c.sentAt).getTime() >= month).reduce((a, c) => a + c.stats.sent, 0),
    next: data.campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "")),
    countries: [...m].sort((a, b) => b[1] - a[1]).slice(0, 6),
  };
}

function Overview({ data, go, blockers }: { data: MarketingData; go: (t: Tab) => void; blockers: string[] }) {
  const { active, fresh, left, top, sent30, next, countries } = overviewFigures(data);
  const tier = (p: Priority) => active.filter((s) => s.priority === p).length;
  const pct = (n: number) => (active.length ? Math.round((n / active.length) * 100) : 0);
  // cumulative: how the list has grown over the month
  const base = active.length - data.growth.reduce((a, g) => a + g.n, 0);
  const cumulative = data.growth.reduce<number[]>((acc, g) => [...acc, (acc.at(-1) ?? Math.max(0, base)) + g.n], []);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card i={1} tone="dark">
          <Stat dark label="Subscribed" value={active.length} sub={`${data.total.toLocaleString("en-US")} on the list in all`} />
        </Card>
        <Card i={2}>
          <Stat label="New in 30 days" value={fresh} sub="Signups, imports and buyers added" />
        </Card>
        <Card i={3}>
          <Stat label="VIP and High" value={top} sub={`${pct(top)}% of subscribers: write to them first`} />
        </Card>
        <Card i={4}>
          <Stat label="Emails sent, 30 days" value={sent30} sub={`${left} unsubscribed in all`} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card i={5} className="lg:col-span-2">
          <CardHead title="List growth" sub="Subscribers over the last 30 days" right={<Pill>+{fresh}</Pill>} />
          <div className="mt-4">
            <LineChart values={cumulative} labels={data.growth.map((g, i) => (i % 7 === 0 ? new Date(g.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""))} area />
          </div>
        </Card>
        <Card i={6}>
          <CardHead title="Priority mix" sub="Scored daily from inquiries, orders and recency" />
          <div className="mt-5 grid gap-3.5">
            {PRIORITIES.map((p) => (
              <Meter key={p} label={`${PRIORITY_LABEL[p]} · ${tier(p)}`} value={pct(tier(p))} />
            ))}
          </div>
          <Btn tone="light" className="mt-5" onClick={() => go("subscribers")}>
            Open the list
          </Btn>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card i={7}>
          <CardHead title="Coming up" sub="The mail schedule" />
          {next.length ? (
            <ul className="mt-4 grid gap-2">
              {next.slice(0, 4).map((c) => (
                <li key={c.id} className="rounded-2xl bg-white/70 px-4 py-3">
                  <p className="truncate text-[14px] font-semibold">{c.name}</p>
                  <p className="text-[12.5px] text-ink/55">{c.status === "sending" ? `Sending: ${c.stats.sent}/${c.stats.targeted}` : when(c.scheduledAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13.5px] text-ink/55">Nothing scheduled.</p>
          )}
          <Btn className="mt-4" onClick={() => go("schedule")}>
            Plan a send
          </Btn>
        </Card>
        <Card i={8}>
          <CardHead title="Where they joined" sub="Subscribed, by source" />
          <div className="mt-5 grid gap-3.5">
            {SOURCES.map((s) => {
              const n = active.filter((x) => x.source === s).length;
              return n ? <Meter key={s} label={`${SOURCE_LABEL[s]} · ${n}`} value={pct(n)} /> : null;
            })}
            {!active.length && <p className="text-[13.5px] text-ink/55">No subscribers yet.</p>}
          </div>
        </Card>
        <Card i={9}>
          <CardHead title="Markets" sub="Subscribers with a country" />
          <div className="mt-5 grid gap-3.5">
            {countries.length ? countries.map(([c, n]) => <Meter key={c} label={`${c} · ${n}`} value={pct(n)} />) : <p className="text-[13.5px] text-ink/55">No countries known yet.</p>}
          </div>
        </Card>
      </div>

      <Card i={10}>
        <CardHead title="Setup" sub="What campaigns need" />
        <ul className="mt-4 grid gap-2 text-[13.5px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { ok: !blockers.some((b) => b.startsWith("email")), label: "Email (Resend)", hint: "RESEND_API_KEY, INQUIRY_FROM" },
            { ok: !blockers.some((b) => b.startsWith("a signing")), label: "Unsubscribe links", hint: "MARKETING_SECRET" },
            { ok: data.templates.length > 0, label: "A mail model", hint: "Mail models tab" },
            { ok: active.length > 0, label: "Subscribers", hint: "Signups, import or buyers" },
          ].map((x) => (
            <li key={x.label} className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3">
              <span className={x.ok ? "grid size-6 place-items-center rounded-full bg-[#2f8f5b] text-white" : "grid size-6 place-items-center rounded-full bg-ink/10 text-ink/50"} aria-hidden="true">
                {x.ok ? "✓" : "·"}
              </span>
              <span>
                <span className="font-semibold">{x.label}</span>
                <span className="block text-[12px] text-ink/50">{x.ok ? "Ready" : x.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function InquiriesAndLists({ data }: { data: MarketingData }) {
  const panel = usePanel();
  const act = useAction();
  const byEmail = useMemo(() => new Map(data.subscribers.map((s) => [s.email, s])), [data.subscribers]);
  const latest = panel.inquiries.slice(0, 25);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.subscribers) if (s.status === "subscribed") for (const t of s.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [data.subscribers]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {PIPELINE.map((p, i) => (
          <Card key={p.id} i={i + 1} className="p-4! sm:p-5!">
            <p className="text-[12.5px] font-semibold text-ink/60">{p.label}</p>
            <p className="mt-1 text-[30px] leading-none font-light tabular-nums">{panel.inquiries.filter((x) => x.status === p.id).length}</p>
          </Card>
        ))}
        <Card i={6} tone="dark" className="p-4! sm:p-5!">
          <p className="text-[12.5px] font-semibold text-white/70">Not on the list</p>
          <p className="mt-1 text-[30px] leading-none font-light tabular-nums">{data.buyers.length}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card i={7} className="lg:col-span-2">
          <CardHead
            title="Latest inquiries"
            sub="Each buyer's place on the list"
            right={
              <Link href="/admin/inquiries" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white">
                Inquiry desk <AdminIcon name="up" className="size-3.5 rotate-90" />
              </Link>
            }
          />
          {latest.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[13.5px]">
                <thead className="text-[12px] text-ink/50">
                  <tr className="[&>th]:pb-2 [&>th]:font-semibold">
                    <th>Ref</th>
                    <th>Buyer</th>
                    <th>Wants</th>
                    <th>Stage</th>
                    <th className="text-right">On the list</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((i) => {
                    const sub = byEmail.get(i.email.toLowerCase());
                    return (
                      <tr key={i.ref} className="border-t border-ink/[0.06] [&>td]:py-2.5">
                        <td className="pr-3 font-mono text-[12px] whitespace-nowrap">
                          <Link href={`/admin/inquiries/${i.ref}`} className="hover:underline">
                            {i.ref}
                          </Link>
                        </td>
                        <td className="max-w-[220px] pr-3">
                          <span className="block truncate font-semibold">{i.company}</span>
                          <span className="block truncate text-[12px] text-ink/55">
                            {i.flag} {i.country} · {ago(i.createdAt)}
                          </span>
                        </td>
                        <td className="pr-3 whitespace-nowrap">{intentLabel(i.intent)}</td>
                        <td className="pr-3 capitalize">{i.status}</td>
                        <td className="text-right">
                          {sub ? (
                            <Pill tone={sub.status === "unsubscribed" ? "bad" : sub.priority}>{sub.status === "unsubscribed" ? "Unsubscribed" : `${PRIORITY_LABEL[sub.priority]} · ${sub.sid}`}</Pill>
                          ) : (
                            <Btn tone="light" disabled={act.pending} onClick={() => act.run(() => importBuyersAction({ emails: [i.email.toLowerCase()] }), `${i.company} added to the list.`)}>
                              Add
                            </Btn>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4">
              <Empty>No inquiries yet.</Empty>
            </div>
          )}
          <div className="mt-3">
            <ErrorLine error={act.error} />
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card i={8} tone="dark">
            <CardHead dark title="Buyers not on the list" sub="Sent an inquiry, never subscribed" />
            <p className="mt-4 text-[13px] text-white/70">
              Existing buyers can get trade updates (soft opt-in). They join tagged #buyer, scored from their inquiries, and every email lets them unsubscribe.
            </p>
            <ul className="mt-3 grid gap-1.5 text-[13px]">
              {data.buyers.slice(0, 5).map((b) => (
                <li key={b.email} className="flex justify-between gap-2 truncate text-white/85">
                  <span className="truncate">{b.company}</span>
                  <span className="flex-none text-white/50">{b.inquiries > 1 ? `${b.inquiries} inquiries` : ago(b.at)}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={act.pending || !data.buyers.length}
              onClick={() => act.run(() => importBuyersAction({}), (r) => `${r.added ?? 0} buyers added to the list.`)}
              className="mt-4 min-h-10 w-full rounded-full bg-white px-4 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {data.buyers.length ? `Add all ${data.buyers.length}` : "Everyone's on the list"}
            </button>
          </Card>
          <Card i={9}>
            <CardHead title="Lists" sub="Subscribed, by tag" />
            {tags.length ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {tags.map(([t, n]) => (
                  <li key={t}>
                    <Pill>
                      #{t} <span className="text-ink/45 tabular-nums">{n}</span>
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13.5px] text-ink/55">Tags appear as you add them to subscribers.</p>
            )}
            <p className="mt-3 text-[12px] text-ink/50">Pick tiers and tags as a campaign&apos;s audience in the Schedule tab.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
