export function statusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-50 text-green-700";
    case "PENDING_PAYMENT":
      return "bg-yellow-50 text-yellow-700";
    case "COMPLETED":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    case "NO_SHOW":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-50 text-green-700";
    case "PENDING":
      return "bg-yellow-50 text-yellow-700";
    case "FAILED":
      return "bg-red-50 text-red-700";
    case "REFUNDED":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
