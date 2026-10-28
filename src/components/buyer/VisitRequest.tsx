"use client";

import clsx from "clsx";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { useUI } from "@/lib/store";

const KINDS = [
  { id: "call", label: "Video call", sub: "A live tour of the factory and samples room" },
  { id: "visit", label: "Visit in Guangzhou", sub: "See the range and the line in person" },
] as const;

/** Book a factory tour on a call, or a visit; it hands a ready-written note to the inquiry form. */
export function VisitRequest() {
  const uid = useId();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("call");
  const [date, setDate] = useState("");
  // kept as typed, so the field can be cleared and retyped; read as 1–20 when the request is sent
  const [peopleText, setPeopleText] = useState("1");
  const people = Math.min(20, Math.max(1, Math.round(Number(peopleText)) || 1));
  const openDrawer = useUI((s) => s.openDrawer);

  const send = () => {
    const what = kind === "call" ? "Video call factory tour" : "Visit to Guangzhou";
    openDrawer(undefined, undefined, `${what} request${date ? ` around ${date}` : ""}, ${people} ${people > 1 ? "people" : "person"}.`, "visit");
  };

  return (
    <div data-deco="card" className="rounded-shell bg-tile p-[clamp(20px,4vw,40px)]">
      <fieldset>
        <legend className="text-[15px] font-semibold">How would you like to meet?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {KINDS.map((k) => (
            <label
              key={k.id}
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-card bg-white p-4 ring-1 transition-shadow has-focus-visible:ring-2 has-focus-visible:ring-ink",
                kind === k.id ? "ring-ink" : "ring-ink/8 hover:ring-ink/25",
              )}
            >
              <input type="radio" name={`${uid}-kind`} value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="mt-1 accent-ink" />
              <span>
                <b className="block text-[15px] font-semibold">{k.label}</b>
                <span className="block text-[13.5px] text-ink-2">{k.sub}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-date`} className="text-[14px] font-semibold">
            Preferred date <span className="font-normal text-muted">· optional</span>
          </label>
          <input id={`${uid}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-2" />
        </div>
        <div>
          <label htmlFor={`${uid}-people`} className="text-[14px] font-semibold">
            People joining
          </label>
          <input
            id={`${uid}-people`}
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            value={peopleText}
            onChange={(e) => setPeopleText(e.target.value)}
            onBlur={() => setPeopleText(String(people))}
            className="field mt-2 tabular-nums"
          />
        </div>
      </div>
      <button type="button" onClick={send} className="btn btn-dark mt-6">
        Request a {kind === "call" ? "call" : "visit"} <Icon name="arrow" />
      </button>
    </div>
  );
}
