"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { create } from "zustand";
import type { KaiMessage, KaiMode } from "@/lib/assistant/tools";
import { useInquiry } from "@/lib/store";

/*
 * Kai has two desks: trade help (styles, terms, shipping, inquiries) and business planning (timing, what to order,
 * landed cost, cash). Each desk is its own conversation per browser tab, shared by the pop-up panel and the
 * /assistant page, kept in sessionStorage so it survives page changes and reloads but not closing the tab. Each
 * request tells the server the desk, the page and the styles on the visitor's inquiry list; the planning desk also
 * sends what the visitor entered in the business planner (kept in their browser).
 */

export type { KaiMode };
export const MODES: { id: KaiMode; label: string; hint: string }[] = [
  { id: "trade", label: "Trade help", hint: "Styles, MOQ, samples, shipping, inquiries" },
  { id: "plan", label: "Business plan", hint: "When to order, what to buy, costs and margin" },
];

const KEY: Record<KaiMode, string> = { trade: "kai-chat", plan: "kai-plan" };
/** Where the business planner keeps the visitor's answers (see components/planner). */
export const PLAN_KEY = "cl-plan";
const chats: Partial<Record<KaiMode, Chat<KaiMessage>>> = {};

export function kaiChat(mode: KaiMode = "trade"): Chat<KaiMessage> {
  // on the server every render gets its own (empty) chat: nothing is shared between visitors
  if (typeof window === "undefined") return make(mode);
  return (chats[mode] ??= make(mode));
}

function planProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "null");
    return p && typeof p === "object" ? { country: p.country, level: p.level, firstOrder: p.firstOrder, budget: p.budget, lines: p.lines } : undefined;
  } catch {
    return undefined;
  }
}

function make(mode: KaiMode) {
  return new Chat<KaiMessage>({
    id: mode === "plan" ? "kai-plan" : "kai",
    transport: new DefaultChatTransport({
      api: "/api/assistant",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: {
          ...body,
          mode,
          messages: messages.slice(-20),
          page: location.pathname,
          list: useInquiry.getState().lines.map((l) => l.id),
          ...(mode === "plan" && { plan: planProfile() }),
        },
      }),
    }),
    onFinish: ({ messages }) => save(mode, messages),
  });
}

export function save(mode: KaiMode, messages: KaiMessage[]) {
  try {
    sessionStorage.setItem(KEY[mode], JSON.stringify(messages.slice(-30)));
  } catch {
    // storage blocked or full: the chat still works, it just won't survive a reload
  }
}

export function saved(mode: KaiMode): KaiMessage[] {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY[mode]) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function forget(mode: KaiMode) {
  try {
    sessionStorage.removeItem(KEY[mode]);
  } catch {}
}

/**
 * The panel's state, so any page can open Kai at a desk (the planner's "Ask the planning desk", the home page) and
 * an optional first question.
 */
export const useKai = create<{ open: boolean; mode: KaiMode; ask?: string; setOpen: (open: boolean) => void; setMode: (mode: KaiMode) => void; show: (mode?: KaiMode, ask?: string) => void; asked: () => void }>()((set) => ({
  open: false,
  mode: "trade",
  setOpen: (open) => set({ open }),
  setMode: (mode) => set({ mode }),
  show: (mode, ask) => set((s) => ({ open: true, mode: mode ?? s.mode, ask })),
  asked: () => set({ ask: undefined }),
}));
