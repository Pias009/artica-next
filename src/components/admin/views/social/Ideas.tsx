"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { AdminIcon, Card, Field, Sheet } from "../../ui";
import { Btn, ErrorLine, Input, Pill, Select, useAction } from "../marketing/bits";
import { deleteIdeaAction, moveIdeaAction, saveIdeaAction } from "@/app/admin/marketing-actions";
import {
  CHANNEL_LABEL,
  CHANNELS,
  IDEA_KIND_LABEL,
  IDEA_KINDS,
  IDEA_PRIORITIES,
  IDEA_STAGE_LABEL,
  IDEA_STAGES,
  type Channel,
  type IdeaKind,
  type IdeaPriority,
  type IdeaStage,
} from "@/lib/marketing/model";
import type { MarketingIdea } from "@/lib/marketing/store";

export type IdeaDraft = Omit<MarketingIdea, "id" | "updatedAt" | "createdBy"> & { id?: string };
export const blankIdea = (patch: Partial<IdeaDraft> = {}): IdeaDraft => ({
  title: "",
  kind: "idea",
  channel: "instagram",
  stage: "backlog",
  priority: "medium",
  owner: "",
  due: null,
  notes: "",
  link: "",
  ...patch,
});
const PRIORITY_DOT: Record<IdeaPriority, string> = { high: "bg-danger", medium: "bg-[#c98a1b]", low: "bg-ink/25" };
const today = () => new Date().toISOString().slice(0, 10);

/** The Social team's board: every idea, piece of content, campaign and improvement, from first thought to done. */
export function Ideas({ ideas, admin }: { ideas: MarketingIdea[]; admin: string }) {
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [kind, setKind] = useState<IdeaKind | "all">("all");
  const [mine, setMine] = useState(false);
  const [draft, setDraft] = useState<IdeaDraft | null>(null);
  const act = useAction();
  const shown = useMemo(
    () =>
      ideas.filter(
        (i) => (channel === "all" || i.channel === channel) && (kind === "all" || i.kind === kind) && (!mine || i.owner.toLowerCase() === admin.toLowerCase()),
      ),
    [ideas, channel, kind, mine, admin],
  );
  const move = (i: MarketingIdea, dir: -1 | 1) => {
    const stage = IDEA_STAGES[IDEA_STAGES.indexOf(i.stage) + dir];
    if (stage) act.run(() => moveIdeaAction({ id: i.id, stage }));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Btn onClick={() => setDraft(blankIdea({ owner: admin }))}>New card</Btn>
        <Select label="Channel" hideLabel value={channel} onChange={setChannel} options={[{ id: "all", label: "Every channel" }, ...CHANNELS.map((c) => ({ id: c, label: CHANNEL_LABEL[c] }))]} className="w-[160px]" />
        <Select label="Kind" hideLabel value={kind} onChange={setKind} options={[{ id: "all", label: "Every kind" }, ...IDEA_KINDS.map((k) => ({ id: k, label: IDEA_KIND_LABEL[k] }))]} className="w-[150px]" />
        <Btn tone={mine ? "dark" : "light"} onClick={() => setMine((m) => !m)}>
          {mine ? "Mine only" : "Everyone's"}
        </Btn>
        <span className="ml-auto text-[12.5px] text-ink/55">{act.pending ? "Saving…" : `${shown.length} cards`}</span>
      </div>
      <ErrorLine error={act.error} />

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1080px] grid-cols-5 gap-3">
          {IDEA_STAGES.map((stage, c) => {
            const cards = shown.filter((i) => i.stage === stage).sort((a, b) => IDEA_PRIORITIES.indexOf(a.priority) - IDEA_PRIORITIES.indexOf(b.priority));
            return (
              <Card key={stage} i={c + 1} className="p-3! sm:p-3!">
                <div className="flex items-center justify-between px-2 pt-1 pb-3">
                  <h2 className="text-[14px] font-semibold">{IDEA_STAGE_LABEL[stage]}</h2>
                  <span className="flex items-center gap-1">
                    <span className="grid size-6 place-items-center rounded-full bg-ink/[0.07] text-[12px] font-semibold tabular-nums">{cards.length}</span>
                    <button type="button" aria-label={`Add a card to ${IDEA_STAGE_LABEL[stage]}`} onClick={() => setDraft(blankIdea({ stage, owner: admin }))} className="grid size-7 place-items-center rounded-full text-[16px] text-ink/55 hover:bg-ink/[0.06]">
                      +
                    </button>
                  </span>
                </div>
                <ul className="grid min-h-24 gap-2">
                  {cards.map((i) => {
                    const late = i.due && i.stage !== "done" && i.due < today();
                    return (
                      <li key={i.id} className="group rounded-2xl bg-white/85 p-3 shadow-[0_1px_2px_rgb(18_20_22/.06)]">
                        <button type="button" onClick={() => setDraft({ ...i })} className="block w-full text-left">
                          <span className="flex items-center gap-1.5 text-[11.5px] text-ink/50">
                            <span className={clsx("size-2 rounded-full", PRIORITY_DOT[i.priority])} aria-label={`${i.priority} priority`} />
                            {CHANNEL_LABEL[i.channel]}
                          </span>
                          <span className={clsx("mt-1 block text-[14px] leading-snug font-semibold", i.stage === "done" && "text-ink/50 line-through")}>{i.title}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Pill>{IDEA_KIND_LABEL[i.kind]}</Pill>
                            {i.due && <Pill tone={late ? "bad" : "soft"}>{new Date(i.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</Pill>}
                            {i.owner && <span className="text-[11.5px] text-ink/50">{i.owner}</span>}
                          </span>
                        </button>
                        <span className="mt-2 flex justify-between opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button type="button" disabled={c === 0 || act.pending} aria-label="Move back a stage" onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded-full hover:bg-ink/[0.06] disabled:invisible">
                            <AdminIcon name="up" className="size-3.5 -rotate-90" />
                          </button>
                          <button type="button" disabled={c === IDEA_STAGES.length - 1 || act.pending} aria-label="Move on a stage" onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded-full hover:bg-ink/[0.06] disabled:invisible">
                            <AdminIcon name="up" className="size-3.5 rotate-90" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>

      <IdeaSheet key={draft?.id ?? (draft ? `new-${draft.stage}-${draft.due}` : "none")} draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

/** Add or edit one card. Also used by the content calendar. */
export function IdeaSheet({ draft, onClose }: { draft: IdeaDraft | null; onClose: () => void }) {
  const [d, setD] = useState<IdeaDraft>(draft ?? blankIdea());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = useAction();
  const set = <K extends keyof IdeaDraft>(k: K) => (v: IdeaDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? "Edit card" : "New card"}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          act.run(() => saveIdeaAction(d), d.id ? "Card saved." : "Card added.", onClose);
        }}
      >
        <Field label="Title" value={d.title} max={140} placeholder="Reel: the −25°C cold test, behind the scenes" onChange={set("title")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Kind" value={d.kind} onChange={set("kind")} options={IDEA_KINDS.map((k) => ({ id: k, label: IDEA_KIND_LABEL[k] }))} />
          <Select label="Channel" value={d.channel} onChange={set("channel")} options={CHANNELS.map((c) => ({ id: c, label: CHANNEL_LABEL[c] }))} />
          <Select label="Stage" value={d.stage} onChange={set("stage") as (v: IdeaStage) => void} options={IDEA_STAGES.map((s) => ({ id: s, label: IDEA_STAGE_LABEL[s] }))} />
          <Select label="Priority" value={d.priority} onChange={set("priority")} options={IDEA_PRIORITIES.map((p) => ({ id: p, label: p[0].toUpperCase() + p.slice(1) }))} />
          <Field label="Owner" value={d.owner} placeholder="Who's on it" onChange={set("owner")} />
          <Input label="Due / publish date" type="date" value={d.due ?? ""} onChange={(v) => set("due")(v || null)} />
        </div>
        <Field label="Notes, copy, brief" multiline max={4000} value={d.notes} onChange={set("notes")} />
        <Input label="Link (draft, asset folder, live post)" value={d.link} placeholder="https://" onChange={set("link")} invalid={!!d.link && !/^https?:\/\//.test(d.link)} />
        {d.link && /^https?:\/\//.test(d.link) && (
          <a href={d.link} target="_blank" rel="noreferrer" className="-mt-2 text-[12.5px] font-semibold underline">
            Open the link
          </a>
        )}
        <ErrorLine error={act.error} />
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" disabled={act.pending || !d.title.trim()}>
            {act.pending ? "Saving…" : d.id ? "Save" : "Add card"}
          </Btn>
          {d.id && (
            <Btn tone="danger" className="ml-auto" disabled={act.pending} onClick={() => (confirmDelete ? act.run(() => deleteIdeaAction({ id: d.id }), "Card deleted.", onClose) : setConfirmDelete(true))}>
              {confirmDelete ? "Delete for good?" : "Delete"}
            </Btn>
          )}
        </div>
      </form>
    </Sheet>
  );
}
