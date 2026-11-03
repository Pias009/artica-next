"use client";

import { deskOn } from "@/lib/content/live";
import { useEffect } from "react";
import { useKai } from "./kai";
import { KaiChat, KaiModeTabs } from "./KaiChat";

/** The /assistant page's chat: both desks, with `?desk=plan` opening the planning desk. */
export function AssistantDesk() {
  const picked = useKai((s) => s.mode);
  const mode = deskOn(picked) ? picked : picked === "plan" ? "trade" : "plan";
  const setMode = useKai((s) => s.setMode);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("desk") === "plan") setMode("plan");
  }, [setMode]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <KaiModeTabs className="mx-auto w-full max-w-[420px]" />
      <div className="min-h-0 flex-1">
        <KaiChat key={mode} mode={mode} wide autoFocus />
      </div>
    </div>
  );
}
