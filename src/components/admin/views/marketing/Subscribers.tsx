"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ago } from "../../panel-data";
import { Card, Field, Segmented, Sheet, Toggle } from "../../ui";
import { Btn, downloadCsv, Empty, ErrorLine, Input, Pill, Select, useAction } from "./bits";
import {
  addSubscriberAction,
  deleteSubscribersAction,
  importSubscribersAction,
  refreshScoresAction,
  setPriorityAction,
  setSubscriberStatusAction,
  updateSubscriberAction,
} from "@/app/admin/marketing-actions";
import { parseImport, PRIORITIES, PRIORITY_LABEL, priorityId, SOURCE_LABEL, SOURCES, type Priority, type SubscriberSource } from "@/lib/marketing/model";
import type { MarketingData, MarketingSubscriber } from "@/lib/marketing/store";

type Filter = { q: string; priority: Priority | "all"; status: "subscribed" | "unsubscribed" | "all"; source: SubscriberSource | "all"; tag: string };
const PAGE = 50;
const splitTags = (s: string) => s.split(/[,\s]+/).filter(Boolean);

/** The subscriber list: who's on it, their priority tier and id, and everything you can do to them. */
export function Subscribers({ data }: { data: MarketingData }) {
  const [f, setF] = useState<Filter>({ q: "", priority: "all", status: "subscribed", source: "all", tag: "all" });
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<MarketingSubscriber | null>(null);
  const [sheet, setSheet] = useState<"add" | "import" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = useAction();

  const tags = useMemo(() => [...new Set(data.subscribers.flatMap((s) => s.tags))].sort(), [data.subscribers]);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return data.subscribers.filter(
      (s) =>
        (f.priority === "all" || s.priority === f.priority) &&
        (f.status === "all" || s.status === f.status) &&
        (f.source === "all" || s.source === f.source) &&
        (f.tag === "all" || s.tags.includes(f.tag)) &&
        (!q || [s.sid, s.email, s.name, s.company, s.country, ...s.tags].some((v) => v.toLowerCase().includes(q))),
    );
  }, [data.subscribers, f]);
  const set = <K extends keyof Filter>(k: K) => (v: Filter[K]) => (setF((x) => ({ ...x, [k]: v })), setShown(PAGE), setPicked(new Set()));
  const ids = [...picked];
  const allShownPicked = rows.length > 0 && rows.slice(0, shown).every((r) => picked.has(r.id));
  const clear = () => (setPicked(new Set()), setConfirmDelete(false));

  return (
    <div className="grid gap-4">
      <Card i={1} className="p-4! sm:p-5!">
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Search" hideLabel type="search" placeholder="Search id, email, company, tag…" value={f.q} onChange={set("q")} className="min-w-[220px] flex-1" />
          <Select
            label="Priority"
            hideLabel
            value={f.priority}
            onChange={set("priority")}
            options={[{ id: "all", label: "Every tier" }, ...PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABEL[p] }))]}
            className="w-[140px]"
          />
          <Select
            label="Status"
            hideLabel
            value={f.status}
            onChange={set("status")}
            options={[
              { id: "subscribed", label: "Subscribed" },
              { id: "unsubscribed", label: "Unsubscribed" },
              { id: "all", label: "Everyone" },
            ]}
            className="w-[150px]"
          />
          <Select
            label="Source"
            hideLabel
            value={f.source}
            onChange={set("source")}
            options={[{ id: "all", label: "Every source" }, ...SOURCES.map((s) => ({ id: s, label: SOURCE_LABEL[s] }))]}
            className="w-[170px]"
          />
          {tags.length > 0 && (
            <Select label="Tag" hideLabel value={f.tag} onChange={set("tag")} options={[{ id: "all", label: "Every tag" }, ...tags.map((t) => ({ id: t, label: `#${t}` }))]} className="w-[150px]" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn onClick={() => setSheet("add")}>Add subscriber</Btn>
          <Btn tone="light" onClick={() => setSheet("import")}>
            Import
          </Btn>
          <Btn
            tone="light"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["id", "priority", "score", "email", "name", "company", "country", "source", "tags", "status", "joined", "emails_sent"],
                ...rows.map((s) => [s.sid, PRIORITY_LABEL[s.priority], s.score, s.email, s.name, s.company, s.country, SOURCE_LABEL[s.source], s.tags.join(" "), s.status, s.createdAt.slice(0, 10), s.sent]),
              ])
            }
          >
            Export {rows.length.toLocaleString("en-US")} as CSV
          </Btn>
          <Btn
            tone="ghost"
            disabled={act.pending}
            title="Re-scores everyone from their inquiries: orders, quotes, volume and recency"
            onClick={() => act.run(() => refreshScoresAction(), (r) => (r.changed ? `Priorities updated: ${r.changed} changed.` : "Priorities are up to date."))}
          >
            {act.pending ? "Working…" : "Recalculate priorities"}
          </Btn>
          <span className="ml-auto text-[12.5px] text-ink/55">
            {rows.length.toLocaleString("en-US")} of {data.total.toLocaleString("en-US")}
            {data.capped && ` (the ${data.subscribers.length.toLocaleString("en-US")} highest scores loaded)`}
          </span>
        </div>
        <div className="mt-3">
          <ErrorLine error={act.error} />
        </div>
      </Card>

      {ids.length > 0 && (
        <div className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-[13px] text-white shadow-[0_20px_40px_-16px_rgb(18_20_22/.6)]">
          <span className="mr-auto font-semibold">{ids.length} selected</span>
          <span className="text-white/60">Set tier:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={act.pending}
              onClick={() => act.run(() => setPriorityAction({ ids, priority: p }), `${ids.length} set to ${PRIORITY_LABEL[p]}.`, clear)}
              className="min-h-8 rounded-full bg-white/10 px-3 font-semibold hover:bg-white/20"
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
          <button
            type="button"
            disabled={act.pending}
            onClick={() => act.run(() => setSubscriberStatusAction({ ids, status: "unsubscribed" }), `${ids.length} unsubscribed.`, clear)}
            className="min-h-8 rounded-full bg-white/10 px-3 font-semibold hover:bg-white/20"
          >
            Unsubscribe
          </button>
          <button
            type="button"
            disabled={act.pending}
            onClick={() =>
              confirmDelete ? act.run(() => deleteSubscribersAction({ ids }), `${ids.length} deleted for good.`, clear) : setConfirmDelete(true)
            }
            className={clsx("min-h-8 rounded-full px-3 font-semibold", confirmDelete ? "bg-danger" : "bg-white/10 hover:bg-white/20")}
          >
            {confirmDelete ? `Delete ${ids.length} for good?` : "Delete"}
          </button>
          <button type="button" onClick={clear} className="min-h-8 rounded-full bg-white px-3 font-semibold text-ink">
            Done
          </button>
        </div>
      )}

      <Card i={2} className="p-0! sm:p-0!">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[13.5px]">
              <thead className="text-[12px] text-ink/50">
                <tr className="[&>th]:px-3 [&>th]:pt-4 [&>th]:pb-2 [&>th]:font-semibold">
                  <th className="w-10 pl-5!">
                    <input
                      type="checkbox"
                      aria-label="Select every row shown"
                      checked={allShownPicked}
                      onChange={() => setPicked(allShownPicked ? new Set() : new Set(rows.slice(0, shown).map((r) => r.id)))}
                      className="size-4 accent-ink"
                    />
                  </th>
                  <th>ID</th>
                  <th>Subscriber</th>
                  <th>Priority</th>
                  <th>Source</th>
                  <th>Tags</th>
                  <th>Joined</th>
                  <th className="pr-5! text-right">Emails</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, shown).map((s) => (
                  <tr key={s.id} className={clsx("border-t border-ink/[0.06] [&>td]:px-3 [&>td]:py-2.5", s.status === "unsubscribed" && "text-ink/45")}>
                    <td className="pl-5!">
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.email}`}
                        checked={picked.has(s.id)}
                        onChange={() =>
                          setPicked((p) => {
                            const n = new Set(p);
                            if (n.has(s.id)) n.delete(s.id);
                            else n.add(s.id);
                            return n;
                          })
                        }
                        className="size-4 accent-ink"
                      />
                    </td>
                    <td className="font-mono text-[12px] whitespace-nowrap tabular-nums">{priorityId(s.sid, s.priority)}</td>
                    <td className="max-w-[280px]">
                      <button type="button" onClick={() => setEditing(s)} className="block max-w-full truncate text-left font-semibold hover:underline">
                        {s.company || s.name || s.email}
                      </button>
                      <span className="block truncate text-[12.5px] text-ink/55">
                        {s.company || s.name ? s.email : ""}
                        {s.country && `${s.company || s.name ? " · " : ""}${s.country}`}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <Pill tone={s.priority}>
                          {PRIORITY_LABEL[s.priority]}
                          {s.priorityLocked && <span aria-label="set by hand">·</span>}
                        </Pill>
                        <span className="text-[12px] text-ink/50 tabular-nums" title="Score out of 100">
                          {s.score}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink/70">{SOURCE_LABEL[s.source]}</td>
                    <td>
                      <span className="flex max-w-[200px] flex-wrap gap-1">
                        {s.tags.slice(0, 3).map((t) => (
                          <Pill key={t}>#{t}</Pill>
                        ))}
                        {s.tags.length > 3 && <Pill>+{s.tags.length - 3}</Pill>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink/60">{ago(s.createdAt)}</td>
                    <td className="pr-5! text-right tabular-nums">{s.status === "unsubscribed" ? <Pill tone="bad">Unsubscribed</Pill> : s.sent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > shown && (
              <div className="flex justify-center p-4">
                <Btn tone="light" onClick={() => setShown((n) => n + PAGE * 2)}>
                  Show more ({(rows.length - shown).toLocaleString("en-US")} left)
                </Btn>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            <Empty>
              {data.total
                ? "Nobody matches these filters."
                : "No subscribers yet. Line-sheet signups and “Talk to the desk” email updates land here, or add buyers from the Inquiries tab."}
            </Empty>
          </div>
        )}
      </Card>

      <EditSheet key={editing?.id ?? "none"} sub={editing} onClose={() => setEditing(null)} />
      <AddSheet open={sheet === "add"} onClose={() => setSheet(null)} />
      <ImportSheet open={sheet === "import"} onClose={() => setSheet(null)} />
    </div>
  );
}

function EditSheet({ sub, onClose }: { sub: MarketingSubscriber | null; onClose: () => void }) {
  const [s, setS] = useState(() => (sub ? { ...sub, tagText: sub.tags.join(", ") } : null));
  const act = useAction();
  if (!sub || !s)
    return (
      <Sheet open={false} onClose={onClose} title="Subscriber">
        {null}
      </Sheet>
    );
  const field = (k: "name" | "company" | "country" | "notes") => (v: string) => setS((x) => x && { ...x, [k]: v });
  const save = () =>
    act.run(
      () =>
        updateSubscriberAction({
          id: sub.id,
          name: s.name,
          company: s.company,
          country: s.country,
          notes: s.notes,
          tags: splitTags(s.tagText),
          priority: s.priority,
          priorityLocked: s.priorityLocked,
        }),
      "Subscriber saved.",
      onClose,
    );
  return (
    <Sheet open onClose={onClose} title={sub.company || sub.email}>
      <div className="grid gap-4">
        <div className="rounded-3xl bg-white/80 p-4">
          <p className="font-mono text-[12px] text-ink/50">{priorityId(sub.sid, s.priority)}</p>
          <p className="mt-1 text-[15px] font-semibold break-all">{sub.email}</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
            <div>
              <dt className="text-ink/50">Score</dt>
              <dd className="font-semibold tabular-nums">{sub.score}/100</dd>
            </div>
            <div>
              <dt className="text-ink/50">Emails sent</dt>
              <dd className="font-semibold tabular-nums">{sub.sent}</dd>
            </div>
            <div>
              <dt className="text-ink/50">Joined</dt>
              <dd className="font-semibold">{ago(sub.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px] text-ink/50">
            {SOURCE_LABEL[sub.source]}
            {sub.lastSentAt && ` · last email ${ago(sub.lastSentAt)}`}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink/70">Priority</p>
          <div className="overflow-x-auto">
            <Segmented label="Priority" value={s.priority} onChange={(v) => setS((x) => x && { ...x, priority: v, priorityLocked: true })} options={PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABEL[p] }))} />
          </div>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-[13.5px]">
            <span>
              Keep this tier
              <span className="block text-[12px] text-ink/50">Off: the score from their inquiries sets it every day.</span>
            </span>
            <Toggle label="Keep this tier" checked={s.priorityLocked} onChange={(v) => setS((x) => x && { ...x, priorityLocked: v })} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={s.name} onChange={field("name")} />
          <Field label="Company" value={s.company} onChange={field("company")} />
          <Field label="Country" value={s.country} onChange={field("country")} />
          <Field label="Tags" value={s.tagText} placeholder="boots, uk, retail" onChange={(v) => setS((x) => x && { ...x, tagText: v })} />
        </div>
        <Field label="Notes" multiline max={1000} value={s.notes} onChange={field("notes")} />
        <ErrorLine error={act.error} />
        <div className="flex flex-wrap gap-2">
          <Btn onClick={save} disabled={act.pending}>
            {act.pending ? "Saving…" : "Save"}
          </Btn>
          <Btn
            tone="light"
            disabled={act.pending}
            onClick={() =>
              act.run(
                () => setSubscriberStatusAction({ ids: [sub.id], status: sub.status === "subscribed" ? "unsubscribed" : "subscribed" }),
                sub.status === "subscribed" ? "Unsubscribed." : "Subscribed again.",
                onClose,
              )
            }
          >
            {sub.status === "subscribed" ? "Unsubscribe" : "Subscribe again"}
          </Btn>
          <Btn tone="danger" disabled={act.pending} onClick={() => act.run(() => deleteSubscribersAction({ ids: [sub.id] }), "Deleted for good.", onClose)}>
            Delete
          </Btn>
        </div>
        {sub.status === "unsubscribed" && <p className="text-[12px] text-ink/50">Only subscribe someone again when they&apos;ve asked to come back.</p>}
      </div>
    </Sheet>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const blank = { email: "", name: "", company: "", country: "", tags: "", priority: "auto" as Priority | "auto" };
  const [s, setS] = useState(blank);
  const act = useAction();
  const field = (k: keyof typeof blank) => (v: string) => setS((x) => ({ ...x, [k]: v }));
  return (
    <Sheet open={open} onClose={onClose} title="Add a subscriber">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          act.run(
            () =>
              addSubscriberAction({
                email: s.email,
                name: s.name || undefined,
                company: s.company || undefined,
                country: s.country || undefined,
                tags: splitTags(s.tags),
                ...(s.priority !== "auto" && { priority: s.priority }),
              }),
            `${s.email} added.`,
            () => (setS(blank), onClose()),
          );
        }}
      >
        <Field label="Email" value={s.email} placeholder="buyer@store.com" onChange={field("email")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={s.name} onChange={field("name")} />
          <Field label="Company" value={s.company} onChange={field("company")} />
          <Field label="Country" value={s.country} onChange={field("country")} />
          <Field label="Tags" value={s.tags} placeholder="trade-show, boots" onChange={field("tags")} />
        </div>
        <Select
          label="Priority"
          value={s.priority}
          onChange={(v) => setS((x) => ({ ...x, priority: v }))}
          options={[{ id: "auto", label: "Work it out from their inquiries" }, ...PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABEL[p] }))]}
        />
        <p className="text-[12px] text-ink/50">Only add people who agreed to hear from you. Every email carries an unsubscribe link.</p>
        <ErrorLine error={act.error} />
        <Btn type="submit" disabled={act.pending || !s.email}>
          {act.pending ? "Adding…" : "Add subscriber"}
        </Btn>
      </form>
    </Sheet>
  );
}

function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const act = useAction();
  const preview = useMemo(() => parseImport(text), [text]);
  return (
    <Sheet open={open} onClose={onClose} title="Import subscribers">
      <div className="grid gap-4">
        <p className="text-[13.5px] text-ink/65">
          One person per line: <code className="rounded bg-ink/[0.06] px-1">email, company, country, tags</code>. Only the email is needed. Paste from a spreadsheet or a CSV file.
        </p>
        <Field label="Rows" multiline value={text} placeholder={"anna@shoes.co.uk, Anna's Shoes, United Kingdom, boots\nbuyer@store.de"} onChange={setText} />
        <Field label="Tag everyone with" value={tags} placeholder="trade-show-2026" onChange={setTags} />
        <p className="text-[12.5px] text-ink/60">
          {preview.rows.length.toLocaleString("en-US")} valid {preview.rows.length === 1 ? "address" : "addresses"}
          {preview.skipped > 0 && `, ${preview.skipped} line${preview.skipped === 1 ? "" : "s"} skipped`}. People already on the list keep their details; anyone who unsubscribed stays unsubscribed.
        </p>
        <ErrorLine error={act.error} />
        <Btn
          disabled={act.pending || !preview.rows.length}
          onClick={() =>
            act.run(
              () => importSubscribersAction({ text, tags: splitTags(tags) }),
              (r) => `${r.added ?? 0} added${r.skipped ? `, ${r.skipped} skipped or already on the list` : ""}.`,
              () => (setText(""), setTags(""), onClose()),
            )
          }
        >
          {act.pending ? "Importing…" : `Import ${preview.rows.length.toLocaleString("en-US")}`}
        </Btn>
      </div>
    </Sheet>
  );
}
