// Status badge colors using design token palette (Warm Earth)
// See docs/ui-guidelines.md §4 — Status Colors

export function statusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-status-success/10 text-status-success";
    case "PENDING_PAYMENT":
      return "bg-status-warning/10 text-status-warning";
    case "COMPLETED":
      return "bg-status-info/10 text-status-info";
    case "CANCELLED":
      return "bg-status-error/10 text-status-error";
    case "NO_SHOW":
      return "bg-border/50 text-text-muted";
    default:
      return "bg-border/50 text-text-muted";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-status-success/10 text-status-success";
    case "PENDING":
      return "bg-status-warning/10 text-status-warning";
    case "FAILED":
      return "bg-status-error/10 text-status-error";
    case "REFUNDED":
      return "bg-border/50 text-text-muted";
    default:
      return "bg-border/50 text-text-muted";
  }
}
