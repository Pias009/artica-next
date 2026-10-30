"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { KaiMessage } from "@/lib/assistant/tools";
import { useInquiry } from "@/lib/store";

/*
 * One conversation with Kai per browser tab, shared by the pop-up panel and the /assistant page, kept in
 * sessionStorage so it survives page changes and reloads but not closing the tab. Each request tells the server the
 * page and the styles already on the visitor's inquiry list, so Kai can take them into account.
 */

const KEY = "kai-chat";
let chat: Chat<KaiMessage> | null = null;

export function kaiChat(): Chat<KaiMessage> {
  // on the server every render gets its own (empty) chat: nothing is shared between visitors
  if (typeof window === "undefined") return make();
  return (chat ??= make());
}

function make() {
  return new Chat<KaiMessage>({
    id: "kai",
    transport: new DefaultChatTransport({
      api: "/api/assistant",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages: messages.slice(-20), page: location.pathname, list: useInquiry.getState().lines.map((l) => l.id) },
      }),
    }),
    onFinish: ({ messages }) => save(messages),
  });
}

export function save(messages: KaiMessage[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-30)));
  } catch {
    // storage blocked or full: the chat still works, it just won't survive a reload
  }
}

export function saved(): KaiMessage[] {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function forget() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
