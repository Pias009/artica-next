"use client";

import { useState } from "react";
import { usePanel } from "../../panel-data";
import { Card, CardHead, Meter } from "../../ui";
import { Btn, Input, Select } from "../marketing/bits";
import { buildUtm, UTM_PRESETS } from "@/lib/marketing/model";

/** What a channel is good for at a wholesale footwear brand: a short reminder next to its numbers. */
const PLAYBOOK: { channel: string; use: string }[] = [
  { channel: "LinkedIn", use: "Store owners and buyers: factory tours, MOQ and lead-time posts, trade-show news." },
  { channel: "Instagram", use: "The product up close: reels of the cold test, new colourways, retailer shelf shots." },
  { channel: "Facebook", use: "Retargeting visitors who looked at styles but didn't ask (needs the Meta Pixel)." },
  { channel: "Google", use: "Search ads on “wholesale winter boots”, “private label shoes” and similar trade terms." },
  { channel: "TikTok", use: "Behind the scenes at the factory; reaches younger independent boutique owners." },
  { channel: "Email", use: "The line sheet each season, order-date reminders and quote follow-ups (Marketing → Schedule)." },
];

/** Where visits come from (the site's own log), what each channel is for, and tagged links for every post and ad. */
export function Channels({ site }: { site: string }) {
  const panel = usePanel();
  const sources = panel.visitors?.sources ?? [];
  const [url, setUrl] = useState(site);
  const [u, setU] = useState({ source: "instagram", medium: "social", campaign: "", content: "", term: "" });
  const [copied, setCopied] = useState(false);
  const link = buildUtm(url, u);
  const set = (k: keyof typeof u) => (v: string) => (setU((x) => ({ ...x, [k]: v })), setCopied(false));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card i={1}>
        <CardHead title="Where visits come from" sub="The last 7 days, from the site's own visit log" />
        <div className="mt-5 grid gap-3.5">
          {sources.length ? sources.map((s) => <Meter key={s.name} label={s.name} value={s.share} />) : <p className="text-[13.5px] text-ink/55">No visits logged yet.</p>}
        </div>
        <p className="mt-4 text-[12px] text-ink/50">Read from the referring site. Tagged links (right) show up by campaign in Google Analytics and Meta.</p>
      </Card>

      <Card i={2} className="lg:col-span-2">
        <CardHead title="Campaign link builder" sub="Tag every post, ad and QR code so you can see what it brought in" />
        <div className="mt-5 grid gap-3">
          <Input label="Page on the site" value={url} onChange={(v) => (setUrl(v), setCopied(false))} placeholder="https://…/catalog" invalid={!!url && buildUtm(url, { source: "x", medium: "x", campaign: "x" }) === null} />
          <Select
            label="Preset"
            value=""
            onChange={(v) => {
              const p = UTM_PRESETS.find((x) => x.label === v);
              if (p) setU((x) => ({ ...x, source: p.source, medium: p.medium }));
            }}
            options={[{ id: "", label: "Pick a channel to fill in source and medium…" }, ...UTM_PRESETS.map((p) => ({ id: p.label, label: p.label }))]}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Source" value={u.source} onChange={set("source")} placeholder="instagram" />
            <Input label="Medium" value={u.medium} onChange={set("medium")} placeholder="social" />
            <Input label="Campaign" value={u.campaign} onChange={set("campaign")} placeholder="winter_2026" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Content (optional)" value={u.content} onChange={set("content")} placeholder="reel_cold_test" />
            <Input label="Keyword (optional)" value={u.term} onChange={set("term")} placeholder="wholesale_boots" />
          </div>
          <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-ink/10">
            <p className="text-[12px] font-semibold text-ink/55">Your link</p>
            <p className="mt-1 font-mono text-[12.5px] break-all">{link ?? "Fill in the page, source, medium and campaign."}</p>
            <Btn
              className="mt-3"
              disabled={!link}
              onClick={() =>
                link &&
                navigator.clipboard
                  .writeText(link)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false))
              }
            >
              {copied ? "Copied" : "Copy link"}
            </Btn>
          </div>
        </div>
      </Card>

      <Card i={3} className="lg:col-span-3">
        <CardHead title="Channel playbook" sub="What each channel is for, at a wholesale footwear brand" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYBOOK.map((p) => (
            <li key={p.channel} className="rounded-2xl bg-white/70 px-4 py-3">
              <p className="text-[14px] font-semibold">{p.channel}</p>
              <p className="mt-0.5 text-[13px] text-ink/60">{p.use}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
