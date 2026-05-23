// Status badge colors — uses inline styles for CSS variable compatibility

export function statusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "status-confirmed";
    case "PENDING_PAYMENT":
    case "PENDING":
      return "status-pending";
    case "COMPLETED":
      return "status-completed";
    case "CANCELLED":
    case "FAILED":
      return "status-cancelled";
    case "NO_SHOW":
    default:
      return "status-default";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "status-confirmed";
    case "PENDING":
      return "status-pending";
    case "FAILED":
      return "status-cancelled";
    case "REFUNDED":
    default:
      return "status-default";
  }
}
