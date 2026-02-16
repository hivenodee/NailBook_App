"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ClientRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  appointmentCount: number;
  lastAppointmentDate: string | null;
};

export default function ClientsPage(): React.JSX.Element {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    fetch(`/api/clients${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setClients(json.data);
      })
      .finally(() => setLoading(false));
  }, [search]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="text-2xl font-semibold">Clients</h1>

      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
          placeholder="Search by name, email, or phone..."
          className="w-full max-w-sm border border-border rounded-button px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : clients.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-3 shadow-card text-center">
          <p className="text-text-muted text-sm">
            {search.trim() ? "No clients match your search." : "No clients yet. They'll appear here after their first booking."}
          </p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="block bg-surface rounded-card p-grid-2 shadow-card hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {client.name || "No name"}
                    </p>
                    {client.appointmentCount <= 1 && (
                      <span className="text-xs bg-primary-light text-primary px-1.5 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{client.email}</p>
                  {client.phone && (
                    <p className="text-xs text-text-muted">{client.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {client.appointmentCount} {client.appointmentCount === 1 ? "visit" : "visits"}
                  </p>
                  {client.lastAppointmentDate && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Last: {formatDate(client.lastAppointmentDate)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
