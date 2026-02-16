"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type AddOn = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  durationMinutes: number;
  depositType: string;
  depositValue: number;
  addOns: AddOn[];
};

type ServiceListProps = {
  services: Service[];
  slug: string;
  booksOpen?: boolean;
};

export default function ServiceList({ services, slug, booksOpen = true }: ServiceListProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("service");
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const cardRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (id === highlightId) {
        highlightRef.current = el;
      }
    },
    [highlightId]
  );

  return (
    <div className="space-y-grid-1">
      {services.map((service) => (
        <div
          key={service.id}
          ref={cardRef(service.id)}
          className={`bg-surface rounded-card p-grid-2 shadow-card${
            service.id === highlightId ? " ring-2 ring-primary" : ""
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-text-muted mt-0.5">
                  {service.description}
                </p>
              )}
              <p className="text-sm text-text-muted mt-1">
                {service.durationMinutes} min
              </p>
              {service.addOns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {service.addOns.map((addon) => (
                    <span
                      key={addon.id}
                      className="text-xs bg-primary-light text-text-secondary px-2 py-0.5 rounded-full"
                    >
                      {addon.name} +${(addon.priceInCents / 100).toFixed(2)}
                      {addon.durationMinutes > 0 && ` · +${addon.durationMinutes}min`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="font-medium">
                ${(service.priceInCents / 100).toFixed(2)}
              </p>
              {service.depositType !== "NONE" && (
                <p className="text-xs text-text-muted">
                  Deposit:{" "}
                  {service.depositType === "FLAT"
                    ? `$${(service.depositValue / 100).toFixed(2)}`
                    : `${service.depositValue}%`}
                </p>
              )}
            </div>
          </div>
          {booksOpen ? (
            <a
              href={`/${slug}/book?service=${service.id}`}
              className="mt-grid-2 block w-full text-center bg-primary text-white py-2.5 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Book Now
            </a>
          ) : (
            <span className="mt-grid-2 block w-full text-center bg-gray-300 text-gray-500 py-2.5 rounded-button text-sm font-medium cursor-not-allowed">
              Book Now
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
