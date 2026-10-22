/** A legal page's body: numbered sections of plain paragraphs, set for reading. */
export function LegalText({ updated, sections }: { updated: string; sections: { title: string; body: string[] }[] }) {
  return (
    <div className="wrap">
      <p className="text-[14px] text-muted">Last updated {updated}</p>
      <div className="mt-8 grid max-w-[760px] gap-10">
        {sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`legal-${i}`}>
            <h2 id={`legal-${i}`} className="text-[22px] font-semibold tracking-[-0.01em]">
              {i + 1}. {s.title}
            </h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 text-[16px] leading-[1.65] text-ink-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
