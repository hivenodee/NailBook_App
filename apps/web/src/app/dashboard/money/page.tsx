"use client";

import React, { useEffect, useState } from "react";

type Payment = {
  id: string;
  amountInCents: number;
  type: string;
  status: string;
  method: string;
  createdAt: string;
  appointment: {
    service: { name: string };
    client: { firstName: string | null; lastName: string | null };
  };
};

function paymentStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "DEPOSIT":
      return "Deposit";
    case "FULL":
      return "Full payment";
    case "REFUND":
      return "Refund";
    default:
      return type;
  }
}

const PAGE_SIZE = 20;

export default function MoneyPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payments?limit=${PAGE_SIZE}&offset=${offset}`
        );
        const json = await res.json();
        setPayments(json.data?.payments || []);
        setTotal(json.data?.total || 0);
      } catch (e) {
        console.error("Failed to load payments:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offset]);

  // Calculate total earned from completed payments
  const totalEarned = payments
    .filter((p) => p.status === "COMPLETED" && p.type !== "REFUND")
    .reduce((sum, p) => sum + p.amountInCents, 0);

  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-grid-3">
      <h1 className="text-2xl font-semibold">Money</h1>

      {/* Summary */}
      <div className="bg-surface rounded-card p-grid-2 shadow-card">
        <p className="text-text-muted text-sm">Total earned (this page)</p>
        <p className="text-2xl font-semibold">
          ${(totalEarned / 100).toFixed(2)}
        </p>
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="text-text-muted text-sm">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">No payments yet</p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {payments.map((payment) => {
            const clientName =
              payment.appointment.client.firstName
                ? `${payment.appointment.client.firstName} ${payment.appointment.client.lastName || ""}`.trim()
                : "Client";

            return (
              <div
                key={payment.id}
                className="bg-surface rounded-card p-grid-2 shadow-card"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{clientName}</p>
                    <p className="text-text-muted text-xs">
                      {payment.appointment.service.name}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {new Date(payment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">
                      ${(payment.amountInCents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {typeLabel(payment.type)}
                    </p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentStatusColor(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(hasPrev || hasMore) && (
        <div className="flex justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPrev}
            className="text-sm font-medium px-4 py-2 rounded-button bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasMore}
            className="text-sm font-medium px-4 py-2 rounded-button bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
