"use client";

/*
 * Vela's voice: replies read aloud with the browser's own speech (no key, nothing sent anywhere), and a soft chime
 * when an answer arrives. Both stay silent where the browser can't do them.
 */

const PREFERRED = /samantha|aria|jenny|libby|sonia|serena|google uk english female|google us english|natural/i;

let chosen: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (chosen) return chosen;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
  chosen = en.find((v) => PREFERRED.test(v.name)) ?? en.find((v) => v.localService) ?? en[0] ?? null;
  return chosen;
}

/** Markdown out, and only the opening of a long answer: a spoken reply should be short. */
export function forSpeech(text: string, max = 420) {
  const plain = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trim()}…`;
}

export function speak(text: string, on: { start?: () => void; end?: () => void } = {}) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return on.end?.();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.pitch = 1.05;
  u.onstart = () => on.start?.();
  u.onend = u.onerror = () => on.end?.();
  synth.speak(u);
}

export const hush = () => window.speechSynthesis?.cancel();

let audio: AudioContext | null = null;
/** Two soft rising notes. */
export function chime() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    [660, 990].forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.06, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
      o.connect(g).connect(audio!.destination);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.55);
    });
  } catch {}
}
