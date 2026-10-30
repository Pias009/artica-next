"use client";

import { useSyncExternalStore } from "react";

/*
 * Kai's voice: replies read aloud by the browser's own speech synthesis (no audio service, nothing leaves the
 * device). Off until the visitor turns it on; the choice is remembered on this device. One reply speaks at a time.
 */

const KEY = "kai-voice";
const listeners = new Set<() => void>();
let speaking: string | null = null;
const emit = () => listeners.forEach((l) => l());

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/* ---- the on/off preference ---- */

const readOn = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};
export function setVoiceOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (!on) stopSpeaking();
  emit();
}
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));
export const useVoiceOn = () => useSyncExternalStore(subscribe, readOn, () => false);
/** The id of the message being read, if any. */
export const useSpeaking = () => useSyncExternalStore(subscribe, () => speaking, () => null);

/* ---- speaking ---- */

/** Markdown and links out, list markers into pauses: what a person would say. */
const plain = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.{2,}/g, ".")
    .replace(/·/g, ",")
    .trim();

/** The reply's language from its script, so a Bangla or Chinese reply isn't read with an English voice. */
function langOf(text: string) {
  if (/[ঀ-৿]/.test(text)) return "bn-BD";
  if (/[一-鿿]/.test(text)) return "zh-CN";
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN";
  if (/[Ѐ-ӿ]/.test(text)) return "ru-RU";
  if (/[぀-ヿ]/.test(text)) return "ja-JP";
  if (/[가-힯]/.test(text)) return "ko-KR";
  // Latin script: the visitor's own language if it's written that way (a French buyer gets French), else English
  const own = navigator.language || "en-US";
  return LATIN.has(own.split("-")[0]) ? own : "en-US";
}
const LATIN = new Set("en fr de es it pt nl pl tr id ms vi sv da no nb fi cs ro hu sk sl hr et lv lt".split(" "));

/** The most natural-sounding installed voice for a language (the "Natural"/"Neural"/Google voices first). */
function voiceFor(lang: string) {
  const all = speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  const fits = all.filter((v) => v.lang === lang || v.lang.startsWith(base));
  const rank = (v: SpeechSynthesisVoice) => (/natural|neural|premium|enhanced/i.test(v.name) ? 0 : /google|samantha|daniel|serena/i.test(v.name) ? 1 : v.localService ? 2 : 3);
  return fits.sort((a, b) => rank(a) - rank(b))[0];
}

export function speak(id: string, text: string) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const words = plain(text);
  if (!words) return;
  const u = new SpeechSynthesisUtterance(words);
  u.lang = langOf(words);
  const v = voiceFor(u.lang);
  if (v) u.voice = v;
  u.rate = 1.03;
  const done = () => {
    if (speaking === id) {
      speaking = null;
      emit();
    }
  };
  u.onend = done;
  u.onerror = done;
  speaking = id;
  emit();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  if (speaking) {
    speaking = null;
    emit();
  }
}
