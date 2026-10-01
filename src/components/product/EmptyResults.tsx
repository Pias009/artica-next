"use client";

import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";

/** Shown when search/filters match nothing: explain, then offer a way out. */
export function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full grid justify-items-center gap-3 rounded-card bg-tile px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface text-ink-2">
        <Icon name="search" className="size-5" />
      </span>
      <p className="font-bold">No styles match</p>
      <p className="max-w-[38ch] text-[13px] text-muted">
        Try another word or filter. Need something specific? We develop to order from 600 pairs.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onReset} className="btn btn-line">
          Clear search and filters
        </button>
        <OpenInquiryButton className="btn btn-dark">Ask about a custom style</OpenInquiryButton>
      </div>
    </div>
  );
}
