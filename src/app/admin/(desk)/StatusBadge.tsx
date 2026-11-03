import clsx from "clsx";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/admin/format";
import type { Status } from "@/lib/leads/db";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={clsx("inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap", STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
