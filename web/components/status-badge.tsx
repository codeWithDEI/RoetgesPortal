import { statusLabels } from "@/lib/presentation";
import type { TopicStatus } from "@/lib/topics";

export function StatusBadge({ status }: { status: TopicStatus }) {
  return (
    <span className="status-badge" data-status={status}>
      <span className="status-badge__dot" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
