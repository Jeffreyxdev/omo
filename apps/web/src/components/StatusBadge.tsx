import type { Status } from "@udyking/shared";
import { STATUS_COLORS, cn } from "@udyking/shared";

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("badge", STATUS_COLORS[status])}>
      {status === "OPEN" ? "Open" : "Closed"}
    </span>
  );
}
