"use client";

import { usePanel } from "../panel-data";
import { Card } from "../ui";
import { Empty, Stat, Tabs, useTab } from "./marketing/bits";
import { Calendar } from "./social/Calendar";
import { Channels } from "./social/Channels";
import { Ideas } from "./social/Ideas";
import { Tracking } from "./social/Tracking";
import { TRACKERS, trackerIdOk } from "@/lib/marketing/model";
import type { SocialData } from "@/lib/marketing/store";

/*
 * The social media marketing team's desk: the tracking tags (Meta Pixel, Google Analytics and the rest) behind the
 * site's cookie banner, the board of ideas, content and improvements, the content calendar, and channel links.
 * Tags save with the site's other edits (content-actions); the board through app/admin/marketing-actions.ts.
 */

const TABS = ["tracking", "board", "calendar", "channels"] as const;
type Tab = (typeof TABS)[number];

/** Open cards, due within a week, overdue, and done in the last 30 days. */
function boardFigures(ideas: SocialData["ideas"], now = Date.now()) {
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const week = day(now + 7 * 86_400_000);
  const today = day(now);
  const live = ideas.filter((i) => i.stage !== "done");
  return {
    open: live.length,
    due: live.filter((i) => i.due && i.due <= week).length,
    late: live.filter((i) => i.due && i.due < today).length,
    done: ideas.filter((i) => i.stage === "done" && now - new Date(i.updatedAt).getTime() < 30 * 86_400_000).length,
  };
}

export function Social({ data, tab: initial, admin, site }: { data: SocialData | null; tab: string; admin: string; site: string }) {
  const panel = usePanel();
  const [tab, setTab] = useTab<Tab>(initial as Tab, TABS);
  const tags = panel.content.tracking?.tags ?? {};
  const live = TRACKERS.filter((t) => tags[t.id]?.on && trackerIdOk(t.id, tags[t.id]!.id)).length;
  const ideas = data?.ideas ?? [];
  const { open, due, late, done } = boardFigures(ideas);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card i={0} tone="dark">
          <Stat dark label="Tracking tags live" value={live} sub={`of ${TRACKERS.length}: Meta, Google, LinkedIn, TikTok, Clarity`} />
        </Card>
        <Card i={1}>
          <Stat label="Open cards" value={open} sub="Ideas, content and improvements in play" />
        </Card>
        <Card i={2}>
          <Stat label="Due this week" value={due} sub={late ? `${late} overdue` : "Nothing overdue"} />
        </Card>
        <Card i={3}>
          <Stat label="Shipped, 30 days" value={done} sub="Cards moved to Done" />
        </Card>
      </div>

      <Tabs
        label="Social sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: "tracking", label: "Tracking & analytics", n: live },
          { id: "board", label: "Ideas board", n: open },
          { id: "calendar", label: "Content calendar" },
          { id: "channels", label: "Channels & links" },
        ]}
      />

      {tab === "tracking" && <Tracking />}
      {tab === "channels" && <Channels site={site} />}
      {(tab === "board" || tab === "calendar") &&
        (data ? (
          tab === "board" ? (
            <Ideas ideas={ideas} admin={admin} />
          ) : (
            <Calendar data={data} admin={admin} />
          )
        ) : (
          <Card>
            <Empty>No database connected (MONGODB_URI): the board and calendar are kept there.</Empty>
          </Card>
        ))}
    </div>
  );
}
