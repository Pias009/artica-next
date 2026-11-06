"use client";

import { useState, useTransition } from "react";
import { ago } from "../../panel-data";
import { restoreStyleAction, styleHistoryAction, type StyleChange } from "@/app/admin/history-actions";

/** Who changed this style and what, newest first, with a way back to before any change. Loads when opened. */
export function StyleHistory({ id, name }: { id: string; name: string }) {
  const [list, setList] = useState<StyleChange[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const load = () => start(async () => setList(await styleHistoryAction(id).catch(() => [])));
  const restore = (entry: string) =>
    start(async () => {
      const r = await restoreStyleAction(id, entry).catch(() => ({ ok: false as const, error: "Couldn't reach the server." }));
      if (r.ok) window.location.reload();
      else setError(r.error);
    });
  return (
    <section aria-label="History" className="mb-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold">History</h2>
        {list === null ? (
          <button type="button" onClick={load} disabled={pending} className="min-h-9 rounded-full bg-ink/[0.06] px-3.5 text-[12.5px] font-semibold hover:bg-ink/[0.1] disabled:opacity-50">
            {pending ? "Loading…" : "Show changes"}
          </button>
        ) : (
          <span className="text-[12px] text-ink/50">Last 180 days</span>
        )}
      </div>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      {list &&
        (list.length ? (
          <ol className="mt-3 grid gap-1.5">
            {list.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-ink/[0.035] px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">Changed {c.fields.join(", ")}</span>
                  <span className="block text-[12px] text-ink/55">
                    {ago(c.at)} · {c.by}
                    {i === 0 && " · latest"}
                  </span>
                </span>
                {asking === c.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] text-ink/60">Put {name} back as it was before this?</span>
                    <button type="button" disabled={pending} onClick={() => restore(c.id)} className="min-h-8 rounded-full bg-ink px-3 text-[12px] font-semibold text-white disabled:opacity-50">
                      {pending ? "Restoring…" : "Restore"}
                    </button>
                    <button type="button" onClick={() => setAsking(null)} className="min-h-8 px-2 text-[12px] font-semibold text-ink/60">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setAsking(c.id)} className="min-h-8 rounded-full bg-white px-3 text-[12px] font-semibold ring-1 ring-ink/10">
                    Undo to before this
                  </button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[13px] text-ink/55">No changes recorded for this style yet. Changes are kept from now on.</p>
        ))}
    </section>
  );
}
