"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { usePanel, useSaver } from "../../panel-data";
import { Card, CardHead, SaveBar, Toggle } from "../../ui";
import { Input, Pill } from "../marketing/bits";
import { saveTrackingAction } from "@/app/admin/content-actions";
import type { SiteContent } from "@/lib/content/model";
import { TRACK_EVENTS, TRACKERS, trackerIdOk, type TrackerId } from "@/lib/marketing/model";

type State = SiteContent["tracking"];

/** Meta Pixel, Google, LinkedIn, TikTok and Clarity: an id and a switch each, published with the site's other edits. */
export function Tracking() {
  const panel = usePanel();
  const init = useMemo<State>(() => panel.content.tracking ?? { tags: {}, events: true }, [panel]);
  const [saved, setSaved] = useState(init);
  const [s, setS] = useState(init);
  const saver = useSaver(saveTrackingAction, setSaved, "Published. Tags load for visitors who accept cookies, from the next page load.");
  const tag = (t: TrackerId) => s.tags[t] ?? { id: "", on: false };
  const setTag = (t: TrackerId, patch: Partial<{ id: string; on: boolean }>) => setS((x) => ({ ...x, tags: { ...x.tags, [t]: { ...tag(t), ...patch } } }));
  const live = TRACKERS.filter((t) => saved.tags[t.id]?.on && trackerIdOk(t.id, saved.tags[t.id]!.id));
  const changes =
    TRACKERS.filter((t) => (s.tags[t.id]?.id ?? "") !== (saved.tags[t.id]?.id ?? "") || !!s.tags[t.id]?.on !== !!saved.tags[t.id]?.on).length + Number(s.events !== saved.events);
  const bad = TRACKERS.some((t) => tag(t.id).on && !trackerIdOk(t.id, tag(t.id).id));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid content-start gap-4 lg:col-span-2">
        {TRACKERS.map((t, i) => {
          const v = tag(t.id);
          const valid = !v.id || trackerIdOk(t.id, v.id);
          const isLive = live.some((l) => l.id === t.id);
          return (
            <Card key={t.id} i={i + 1} className="p-4! sm:p-5!">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-semibold">{t.name}</h2>
                  {isLive ? <Pill tone="ok">Live</Pill> : v.on && !valid ? <Pill tone="bad">Check the id</Pill> : <Pill>Off</Pill>}
                </div>
                <Toggle label={`${t.name} on`} checked={v.on} onChange={(on) => setTag(t.id, { on })} />
              </div>
              <Input
                label={`${t.name} id`}
                hideLabel
                value={v.id}
                placeholder={t.placeholder}
                onChange={(id) => setTag(t.id, { id })}
                invalid={!valid}
                hint={valid ? t.hint : `That doesn't look like a ${t.name} id. ${t.hint}`}
                className="mt-3"
              />
            </Card>
          );
        })}
      </div>

      <div className="grid content-start gap-4">
        <Card i={8} tone="dark">
          <CardHead dark title="On the site now" sub="Behind the cookie banner" />
          <p className="mt-4 text-[40px] leading-none font-light tabular-nums">{live.length}</p>
          <p className="mt-1 text-[12.5px] text-white/60">{live.length ? live.map((l) => l.name).join(", ") : "No tags: no banner, no cookies"}</p>
          <ul className="mt-4 grid gap-2 text-[12.5px] text-white/75">
            <li>· Tags load only after a visitor taps “Accept”.</li>
            <li>· Browsers with Global Privacy Control or Do Not Track are never tracked.</li>
            <li>· Visitors can change their mind from “Cookie settings” in the footer.</li>
            <li>· The site&apos;s own visit log (Visitors) stays cookie-free either way.</li>
          </ul>
        </Card>

        <Card i={9}>
          <CardHead title="Conversion events" sub="What the site tells the tags" right={<Toggle label="Send events" checked={s.events} onChange={(events) => setS((x) => ({ ...x, events }))} />} />
          <div className="mt-4 overflow-x-auto">
            <table className={clsx("w-full min-w-[300px] text-left text-[12.5px]", !s.events && "opacity-45")}>
              <thead className="text-ink/50">
                <tr className="[&>th]:pb-1.5 [&>th]:font-semibold">
                  <th>On the site</th>
                  <th>Meta</th>
                  <th>Google</th>
                </tr>
              </thead>
              <tbody>
                {TRACK_EVENTS.map((e) => (
                  <tr key={e.id} className="border-t border-ink/[0.06] [&>td]:py-1.5 [&>td]:pr-2">
                    <td>{e.label}</td>
                    <td className="font-mono text-[11.5px]">{e.meta}</td>
                    <td className="font-mono text-[11.5px]">{e.google}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-ink/50">
            Mark <span className="font-mono">Lead</span> / <span className="font-mono">generate_lead</span> as the conversion in Meta and Google Ads to optimise ads for inquiries. Page views are always sent.
          </p>
        </Card>
      </div>

      <SaveBar
        count={changes}
        pending={saver.pending}
        error={saver.error ?? (bad ? "A tag that's switched on needs a valid id." : null)}
        onDiscard={() => (setS(saved), saver.clearError())}
        onSave={() => !bad && saver.save(s)}
      />
    </div>
  );
}
