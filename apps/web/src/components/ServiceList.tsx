"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

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

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

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
    [highlightId],
  );

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const highlighted = service.id === highlightId;
        return (
          <Card
            key={service.id}
            ref={cardRef(service.id)}
            padding="lg"
            hoverLift
            className={cn(
              "relative",
              highlighted && "border-rust-500",
            )}
          >
            <div className="flex justify-between items-start gap-6">
              <div className="min-w-0 flex-1">
                <Heading variant="h4" as="h3" className="text-lg">
                  {service.name}
                </Heading>
                {service.description && (
                  <p className="mt-1 font-sans text-sm text-ink-500 leading-relaxed">
                    {service.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 bg-cream-50 px-3 py-1 text-xs font-sans text-ink-500">
                    <Clock size={12} aria-hidden="true" />
                    {service.durationMinutes} min
                  </span>
                  {service.addOns.map((addon) => (
                    <span
                      key={addon.id}
                      className="rounded-pill border border-ink-200 bg-cream-50 px-3 py-1 text-xs font-sans text-ink-700"
                    >
                      {addon.name} +{formatPrice(addon.priceInCents)}
                      {addon.durationMinutes > 0 && ` · +${addon.durationMinutes} min`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-display text-2xl text-ink-900 leading-none">
                  {formatPrice(service.priceInCents)}
                </p>
                {service.depositType !== "NONE" && (
                  <p className="mt-1.5 text-xs font-sans text-ink-500">
                    {service.depositType === "FLAT"
                      ? `${formatPrice(service.depositValue)} deposit`
                      : `${service.depositValue}% deposit`}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              {booksOpen ? (
                <a
                  href={`/${slug}/book?service=${service.id}`}
                  className="block w-full"
                >
                  <Button variant="primary" size="md" className="w-full">
                    Book now
                  </Button>
                </a>
              ) : (
                <Button variant="secondary" size="md" disabled className="w-full">
                  Books closed
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
