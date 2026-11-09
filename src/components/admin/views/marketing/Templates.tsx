"use client";

import { useState } from "react";
import { ago } from "../../panel-data";
import { Card, CardHead, Field, Sheet } from "../../ui";
import { Btn, Empty, ErrorLine, Pill, Select, useAction } from "./bits";
import { deleteTemplateAction, saveTemplateAction, seedTemplatesAction, sendTestAction } from "@/app/admin/marketing-actions";
import { MERGE_TAGS, renderTemplate, TEMPLATE_KIND_LABEL, TEMPLATE_KINDS, textToHtml, unknownTags, type TemplateKind } from "@/lib/marketing/model";
import type { MarketingTemplate } from "@/lib/marketing/store";

type Draft = { id?: string; name: string; kind: TemplateKind; subject: string; preheader: string; body: string };
const BLANK: Draft = { name: "", kind: "newsletter", subject: "", preheader: "", body: "Hello {{first_name|there}},\n\n\n\nThe Chime Long trade desk" };
const SAMPLE = { company: "Anna's Shoes", first_name: "Anna", email: "anna@annasshoes.co.uk", country: "United Kingdom", subscriber_id: "SUB-00042", site_url: "https://chimelong.com" };

/** Mail models: the reusable emails a campaign is made from, with merge tags and a live preview. */
export function Templates({ templates, onUse, canSend }: { templates: MarketingTemplate[]; onUse: (id: string) => void; canSend: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const act = useAction();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => setDraft(BLANK)}>New mail model</Btn>
        {templates.length < 4 && (
          <Btn tone="light" disabled={act.pending} onClick={() => act.run(() => seedTemplatesAction(), "Starter mail models added.")}>
            Add starter models
          </Btn>
        )}
        <span className="ml-auto text-[12.5px] text-ink/55">Merge tags like {"{{company}}"} are filled in for each subscriber.</span>
      </div>
      <ErrorLine error={act.error} />

      {templates.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t, i) => (
            <Card key={t.id} i={i + 1}>
              <CardHead title={t.name} sub={`Edited ${ago(t.updatedAt)} by ${t.updatedBy.split("@")[0]}`} right={<Pill>{TEMPLATE_KIND_LABEL[t.kind]}</Pill>} />
              <p className="mt-4 text-[13.5px] font-semibold">{renderTemplate(t.subject, SAMPLE)}</p>
              <p className="mt-1 line-clamp-4 text-[13px] whitespace-pre-line text-ink/60">{renderTemplate(t.body, SAMPLE)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn tone="light" onClick={() => setDraft({ id: t.id, name: t.name, kind: t.kind, subject: t.subject, preheader: t.preheader, body: t.body })}>
                  Edit
                </Btn>
                <Btn onClick={() => onUse(t.id)}>Schedule it</Btn>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>No mail models yet. Start from the four starters (line sheet, season launch, quote follow-up, re-engage) or write your own.</Empty>
      )}

      <Editor key={draft?.id ?? (draft ? "new" : "none")} draft={draft} onClose={() => setDraft(null)} canSend={canSend} />
    </div>
  );
}

function Editor({ draft, onClose, canSend }: { draft: Draft | null; onClose: () => void; canSend: boolean }) {
  const [d, setD] = useState<Draft>(draft ?? BLANK);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = useAction();
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const unknown = unknownTags(`${d.subject} ${d.preheader} ${d.body}`);
  const payload = { ...d };

  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? "Edit mail model" : "New mail model"}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <Field label="Name (only you see it)" value={d.name} max={80} onChange={set("name")} />
          <Select label="Kind" value={d.kind} onChange={(v) => setD((x) => ({ ...x, kind: v }))} options={TEMPLATE_KINDS.map((k) => ({ id: k, label: TEMPLATE_KIND_LABEL[k] }))} />
        </div>
        <Field label="Subject line" value={d.subject} max={200} onChange={set("subject")} />
        <Field label="Preview text (shown after the subject in the inbox)" value={d.preheader} max={200} onChange={set("preheader")} />
        <Field label="Email" multiline value={d.body} onChange={set("body")} />
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Merge tags: click to add</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_TAGS.map((m) => (
              <button
                key={m.tag}
                type="button"
                title={m.about}
                onClick={() => setD((x) => ({ ...x, body: `${x.body}{{${m.tag}}}` }))}
                className="rounded-full bg-white/80 px-2.5 py-1 font-mono text-[11.5px] ring-1 ring-ink/10 hover:bg-white"
              >
                {`{{${m.tag}}}`}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-ink/50">
            Add a fallback after a bar: {"{{first_name|there}}"}. **Bold**, [link words](https://…) and bare https links work. The unsubscribe line is added for you.
          </p>
          {unknown.length > 0 && <p className="mt-1.5 text-[12px] font-semibold text-danger">Unknown merge tags, left blank: {unknown.map((t) => `{{${t}}}`).join(", ")}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Preview, for a sample buyer</p>
          <div className="rounded-3xl bg-[#f5f5f2] p-3 ring-1 ring-ink/5">
            <div className="rounded-2xl bg-white p-5">
              <p className="text-[12px] text-ink/45">Subject</p>
              <p className="text-[14.5px] font-semibold">{renderTemplate(d.subject, SAMPLE) || "–"}</p>
              {d.preheader && <p className="text-[12.5px] text-ink/55">{renderTemplate(d.preheader, SAMPLE)}</p>}
              <hr className="my-4 border-ink/[0.07]" />
              {/* textToHtml escapes everything first: only its own paragraphs, links and bold reach the page */}
              <div className="text-[14px] leading-relaxed [&_a]:font-semibold" dangerouslySetInnerHTML={{ __html: textToHtml(renderTemplate(d.body, SAMPLE)) }} />
            </div>
            <p className="mt-2 px-2 text-[11.5px] text-ink/45">You get this because you joined the Chime Long trade list. Unsubscribe</p>
          </div>
        </div>

        <ErrorLine error={act.error} />
        <div className="flex flex-wrap gap-2">
          <Btn disabled={act.pending} onClick={() => act.run(() => saveTemplateAction(payload), "Mail model saved.", onClose)}>
            {act.pending ? "Saving…" : "Save"}
          </Btn>
          <Btn
            tone="light"
            disabled={act.pending || !canSend || !d.subject || !d.body}
            title={canSend ? "Sends this version to your own email" : "Email isn't set up yet (see the banner above)"}
            onClick={() => act.run(() => sendTestAction({ subject: d.subject, preheader: d.preheader, body: d.body }), "Test sent to your email.")}
          >
            Send me a test
          </Btn>
          {d.id && (
            <Btn
              tone="danger"
              className="ml-auto"
              disabled={act.pending}
              onClick={() => (confirmDelete ? act.run(() => deleteTemplateAction({ id: d.id }), "Mail model deleted.", onClose) : setConfirmDelete(true))}
            >
              {confirmDelete ? "Delete for good?" : "Delete"}
            </Btn>
          )}
        </div>
        <p className="text-[12px] text-ink/50">Campaigns keep a copy of the model as it was when scheduled: editing it here doesn&apos;t change emails already scheduled.</p>
      </div>
    </Sheet>
  );
}
