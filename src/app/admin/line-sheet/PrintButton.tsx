"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white">
      Print or save as PDF
    </button>
  );
}
