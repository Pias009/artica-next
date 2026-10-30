import type { ReactNode } from "react";

/**
 * The dark band that closes an information page: one sentence-case line, a supporting sentence and the
 * page's one action. One size across the site, so every page ends on the same note.
 */
export function ClosingBand({ id, title, text, action }: { id: string; eyebrow?: string; title: ReactNode; text: string; action: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="mt-sec flex flex-col items-start gap-6 rounded-shell bg-accent p-[clamp(28px,4vw,56px)] text-on-accent md:flex-row md:items-center md:justify-between"
    >
      <div className="max-w-[620px]">
        <h2 id={id} className="font-headline text-[clamp(28px,3vw,40px)] leading-[1.1] font-semibold tracking-[-0.015em] text-balance">
          {title}
        </h2>
        <p className="mt-3 text-[16px] text-white/75">{text}</p>
      </div>
      {action}
    </section>
  );
}
