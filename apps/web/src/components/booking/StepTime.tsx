"use client";

import * as React from "react";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";
import {
  formatPrice,
  formatShortDate,
  formatTime,
  toDateStr,
} from "./helpers";
import { WaitlistForm } from "./WaitlistForm";
import type {
  AddOnData,
  RecurrenceFreq,
  ServiceData,
  TimeSlot,
  WaitlistTimePref,
} from "./types";

export type StepTimeProps = {
  service: ServiceData;
  serviceId: string | null;
  days: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  slots: TimeSlot[];
  slotsLoading: boolean;
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (s: TimeSlot | null) => void;

  // Add-ons
  selectedAddOnIds: Set<string>;
  toggleAddOn: (id: string) => void;
  unsatisfiedGroupIds: Set<string>;

  // Recurrence
  recurrenceEnabled: boolean;
  setRecurrenceEnabled: (v: boolean) => void;
  recurrenceFreq: RecurrenceFreq;
  setRecurrenceFreq: (v: RecurrenceFreq) => void;
  recurrenceCount: number;
  setRecurrenceCount: (v: number) => void;

  // Waitlist
  waitlistSlot: TimeSlot | null;
  setWaitlistSlot: (s: TimeSlot | null) => void;
  showWaitlistForm: boolean;
  setShowWaitlistForm: (v: boolean) => void;
  waitlistSuccess: boolean;
  setWaitlistSuccess: (v: boolean) => void;
  waitlistName: string;
  setWaitlistName: (v: string) => void;
  waitlistEmail: string;
  setWaitlistEmail: (v: string) => void;
  waitlistPhone: string;
  setWaitlistPhone: (v: string) => void;
  waitlistTimePref: WaitlistTimePref;
  setWaitlistTimePref: (v: WaitlistTimePref) => void;
  waitlistSubmitting: boolean;
  setWaitlistSubmitting: (v: boolean) => void;
  // Pre-fill waitlist when user opens form
  prefillName: string;
  prefillEmail: string;
  prefillPhone: string;
};

export function StepTime(props: StepTimeProps): React.JSX.Element {
  const {
    service,
    days,
    selectedDate,
    setSelectedDate,
    slots,
    slotsLoading,
    selectedSlot,
    setSelectedSlot,
  } = props;

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="space-y-8">
      {/* Date scrubber */}
      <div className="-mx-6 px-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1">
          {days.map((day) => {
            const isSelected = toDateStr(day) === toDateStr(selectedDate);
            return (
              <button
                key={toDateStr(day)}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "shrink-0 flex flex-col items-center w-16 py-2.5 rounded-md border transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                  isSelected
                    ? "bg-rust-500 text-cream-50 border-rust-500"
                    : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
                )}
              >
                <span className="font-sans text-xs uppercase tracking-wide">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="font-display text-2xl mt-0.5 leading-none">
                  {day.getDate()}
                </span>
                <span className="font-sans text-[10px] mt-0.5 uppercase tracking-wide opacity-80">
                  {day.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      <div>
        {slotsLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-md skeleton-shimmer bg-cream-100"
              />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <NoSlotsCard
            {...props}
            availableCount={0}
            label={`No times on ${formatShortDate(selectedDate)}.`}
          />
        ) : (
          <SlotsGrid {...props} />
        )}
      </div>

      {availableSlots.length > 0 && availableSlots.length === slots.length ? null : null}

      {/* Add-ons */}
      {service.addOns.length > 0 && <AddOnsBlock {...props} />}

      {/* Recurrence — only after a slot is picked */}
      {selectedSlot && <RecurrenceBlock {...props} />}
    </div>
  );
}

// ─── Slots ────────────────────────────────────────────────────

function SlotsGrid(props: StepTimeProps): React.JSX.Element {
  const {
    service,
    slots,
    selectedSlot,
    setSelectedSlot,
    waitlistSlot,
    setWaitlistSlot,
    setShowWaitlistForm,
    setWaitlistSuccess,
    showWaitlistForm,
    waitlistSuccess,
    waitlistName,
    setWaitlistName,
    waitlistEmail,
    setWaitlistEmail,
    waitlistPhone,
    setWaitlistPhone,
    prefillName,
    prefillEmail,
    prefillPhone,
    selectedDate,
    serviceId,
    waitlistTimePref,
    setWaitlistTimePref,
    waitlistSubmitting,
    setWaitlistSubmitting,
  } = props;
  const availableSlots = slots.filter((s) => s.available);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isAvailable = slot.available;
          const isSelected = selectedSlot?.startTime === slot.startTime;
          const isWaitlisting = waitlistSlot?.startTime === slot.startTime;

          if (isAvailable) {
            return (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => {
                  setSelectedSlot(slot);
                  setWaitlistSlot(null);
                  setShowWaitlistForm(false);
                }}
                className={cn(
                  "h-11 rounded-md border font-sans text-sm transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                  isSelected
                    ? "bg-rust-500 text-cream-50 border-rust-500"
                    : "bg-cream-50 text-ink-900 border-ink-200 hover:border-ink-300",
                )}
              >
                {formatTime(slot.startTime, service.provider.timezone)}
              </button>
            );
          }

          // Booked
          return (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => {
                setSelectedSlot(null);
                setWaitlistSlot(slot);
                setShowWaitlistForm(true);
                setWaitlistSuccess(false);
                if (prefillName && !waitlistName) setWaitlistName(prefillName);
                if (prefillEmail && !waitlistEmail) setWaitlistEmail(prefillEmail);
                if (prefillPhone && !waitlistPhone) setWaitlistPhone(prefillPhone);
              }}
              className={cn(
                "h-11 rounded-md border font-sans text-xs flex flex-col items-center justify-center transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                isWaitlisting
                  ? "bg-rust-500/10 border-rust-500 text-rust-600"
                  : "bg-cream-50 text-ink-300 border-ink-200 hover:border-ink-300",
              )}
            >
              <span>
                {formatTime(slot.startTime, service.provider.timezone)}
              </span>
              <span className="text-[10px] uppercase tracking-wide">
                Booked
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-slot waitlist form */}
      {waitlistSlot && showWaitlistForm && !waitlistSuccess && (
        <div className="mt-6 border-t border-ink-200 pt-6">
          <p className="font-sans text-sm text-ink-700">
            Join waitlist for{" "}
            {formatTime(waitlistSlot.startTime, service.provider.timezone)}
          </p>
          <WaitlistForm
            serviceId={serviceId}
            selectedDate={selectedDate}
            waitlistSlot={waitlistSlot}
            name={waitlistName}
            setName={setWaitlistName}
            email={waitlistEmail}
            setEmail={setWaitlistEmail}
            phone={waitlistPhone}
            setPhone={setWaitlistPhone}
            timePref={waitlistTimePref}
            setTimePref={setWaitlistTimePref}
            submitting={waitlistSubmitting}
            setSubmitting={setWaitlistSubmitting}
            onSuccess={() => {
              setWaitlistSuccess(true);
              setShowWaitlistForm(false);
            }}
          />
        </div>
      )}

      {waitlistSlot && waitlistSuccess && (
        <p className="mt-6 font-sans text-sm text-rust-600">
          You're on the waitlist. We'll email you if a spot opens up.
        </p>
      )}

      {availableSlots.length === 0 && !waitlistSlot && (
        <DayWaitlistFooter {...props} />
      )}
    </div>
  );
}

function NoSlotsCard(
  props: StepTimeProps & { availableCount: number; label: string },
): React.JSX.Element {
  const { label } = props;
  return (
    <div className="rounded-md border border-dashed border-ink-200 p-8 text-center">
      <p className="font-sans text-sm text-ink-500">{label}</p>
      <DayWaitlistFooter {...props} />
    </div>
  );
}

function DayWaitlistFooter(props: StepTimeProps): React.JSX.Element {
  const {
    showWaitlistForm,
    setShowWaitlistForm,
    waitlistSuccess,
    setWaitlistSuccess,
    waitlistName,
    setWaitlistName,
    waitlistEmail,
    setWaitlistEmail,
    waitlistPhone,
    setWaitlistPhone,
    prefillName,
    prefillEmail,
    prefillPhone,
    waitlistTimePref,
    setWaitlistTimePref,
    waitlistSubmitting,
    setWaitlistSubmitting,
    serviceId,
    selectedDate,
    setWaitlistSlot,
  } = props;

  if (waitlistSuccess) {
    return (
      <p className="mt-3 font-sans text-sm text-rust-600">
        You're on the waitlist. We'll email you if a spot opens up.
      </p>
    );
  }

  if (!showWaitlistForm) {
    return (
      <button
        type="button"
        onClick={() => {
          if (prefillName && !waitlistName) setWaitlistName(prefillName);
          if (prefillEmail && !waitlistEmail) setWaitlistEmail(prefillEmail);
          if (prefillPhone && !waitlistPhone) setWaitlistPhone(prefillPhone);
          setWaitlistSlot(null);
          setShowWaitlistForm(true);
        }}
        className="mt-3 font-sans text-sm text-rust-500 underline-offset-4 hover:underline"
      >
        Join the waitlist for this day
      </button>
    );
  }

  return (
    <WaitlistForm
      serviceId={serviceId}
      selectedDate={selectedDate}
      waitlistSlot={null}
      name={waitlistName}
      setName={setWaitlistName}
      email={waitlistEmail}
      setEmail={setWaitlistEmail}
      phone={waitlistPhone}
      setPhone={setWaitlistPhone}
      timePref={waitlistTimePref}
      setTimePref={setWaitlistTimePref}
      submitting={waitlistSubmitting}
      setSubmitting={setWaitlistSubmitting}
      onSuccess={() => {
        setWaitlistSuccess(true);
        setShowWaitlistForm(false);
      }}
    />
  );
}

// ─── Add-ons ──────────────────────────────────────────────────

function AddOnsBlock({
  service,
  selectedAddOnIds,
  toggleAddOn,
  unsatisfiedGroupIds,
}: StepTimeProps): React.JSX.Element {
  const groups = service.addOnGroups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      ...g,
      addOns: service.addOns
        .filter((a) => a.groupId === g.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  const ungrouped = service.addOns
    .filter((a) => !a.groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!groups.some((g) => g.addOns.length > 0) && ungrouped.length === 0) {
    return <></>;
  }

  return (
    <div>
      <Heading variant="h4" className="text-base mb-4">
        Customize
      </Heading>
      <div className="space-y-5">
        {groups.map((group) => {
          if (group.addOns.length === 0) return null;
          const isRadio = group.rule === "EXACTLY_ONE";
          const isUnsatisfied = unsatisfiedGroupIds.has(group.id);
          return (
            <div key={group.id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
                  {group.name}
                </span>
                {group.rule === "EXACTLY_ONE" && (
                  <span className="font-sans text-xs text-ink-500">
                    Choose one
                  </span>
                )}
                {group.rule === "AT_LEAST_ONE" && (
                  <span className="font-sans text-xs text-ink-500">
                    Pick at least one
                  </span>
                )}
              </div>
              {group.addOns.map((a) => (
                <AddOnRow
                  key={a.id}
                  addon={a}
                  selected={selectedAddOnIds.has(a.id)}
                  isRadio={isRadio}
                  onToggle={() => toggleAddOn(a.id)}
                />
              ))}
              {isUnsatisfied && (
                <p className="font-sans text-xs text-error">
                  {group.rule === "EXACTLY_ONE"
                    ? `Choose one from "${group.name}"`
                    : `Pick at least one from "${group.name}"`}
                </p>
              )}
            </div>
          );
        })}
        {ungrouped.length > 0 && (
          <div className="space-y-2">
            {groups.some((g) => g.addOns.length > 0) && (
              <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
                Other
              </span>
            )}
            {ungrouped.map((a) => (
              <AddOnRow
                key={a.id}
                addon={a}
                selected={selectedAddOnIds.has(a.id)}
                isRadio={false}
                onToggle={() => toggleAddOn(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddOnRow({
  addon,
  selected,
  isRadio,
  onToggle,
}: {
  addon: AddOnData;
  selected: boolean;
  isRadio: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const isMandatory = addon.isMandatory;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isMandatory}
      className={cn(
        "flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        isMandatory
          ? "cursor-default border-ink-200 bg-cream-100 opacity-80"
          : selected
            ? "border-rust-500 bg-rust-500/5"
            : "border-ink-200 bg-cream-50 hover:border-ink-300",
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center border",
            isRadio ? "rounded-pill" : "rounded-sm",
            selected ? "border-rust-500" : "border-ink-300",
            !isRadio && selected && "bg-rust-500",
          )}
          aria-hidden="true"
        >
          {selected && isRadio && (
            <span className="h-2 w-2 rounded-pill bg-rust-500" />
          )}
          {selected && !isRadio && (
            <svg
              className="h-3 w-3 text-cream-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span className="font-sans text-sm text-ink-900">{addon.name}</span>
        {isMandatory && (
          <span className="font-sans text-xs text-ink-500">(included)</span>
        )}
      </span>
      <span className="font-sans text-xs text-ink-500 whitespace-nowrap">
        {`+${formatPrice(addon.priceInCents)}`}
        {addon.durationMinutes > 0 && (
          <span className="ml-2">+{addon.durationMinutes} min</span>
        )}
      </span>
    </button>
  );
}

// ─── Recurrence ───────────────────────────────────────────────

function RecurrenceBlock({
  service,
  selectedSlot,
  recurrenceEnabled,
  setRecurrenceEnabled,
  recurrenceFreq,
  setRecurrenceFreq,
  recurrenceCount,
  setRecurrenceCount,
}: StepTimeProps): React.JSX.Element {
  if (!selectedSlot) return <></>;
  return (
    <div className="rounded-md border border-ink-200 bg-cream-50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm font-medium text-ink-900">
          Repeat this booking?
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={recurrenceEnabled}
          onClick={() => setRecurrenceEnabled(!recurrenceEnabled)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-pill transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
            recurrenceEnabled ? "bg-rust-500" : "bg-cream-100 border border-ink-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-pill bg-cream-50 transition-transform",
              recurrenceEnabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {recurrenceEnabled && (
        <>
          <div>
            <p className="font-sans text-xs uppercase tracking-wide text-ink-500 mb-2">
              Frequency
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["WEEKLY", "Weekly"],
                  ["BIWEEKLY", "Every 2 weeks"],
                  ["MONTHLY", "Monthly"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRecurrenceFreq(val)}
                  className={cn(
                    "rounded-md border py-2 font-sans text-sm transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                    recurrenceFreq === val
                      ? "bg-rust-500 text-cream-50 border-rust-500"
                      : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-sans text-xs uppercase tracking-wide text-ink-500 mb-2">
              Sessions
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setRecurrenceCount(Math.max(2, recurrenceCount - 1))}
                aria-label="Decrease sessions"
                className="h-9 w-9 rounded-pill border border-ink-300 text-ink-700 hover:border-ink-500 transition-colors"
              >
                –
              </button>
              <span className="font-display text-2xl tabular-nums text-ink-900 w-8 text-center">
                {recurrenceCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRecurrenceCount(Math.min(12, recurrenceCount + 1))
                }
                aria-label="Increase sessions"
                className="h-9 w-9 rounded-pill border border-ink-300 text-ink-700 hover:border-ink-500 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <p className="font-sans text-xs uppercase tracking-wide text-ink-500 mb-2">
              Upcoming
            </p>
            <ul className="space-y-1.5">
              {Array.from({ length: recurrenceCount }, (_, i) => {
                const base = new Date(selectedSlot.startTime);
                const d = new Date(base);
                if (recurrenceFreq === "WEEKLY")
                  d.setDate(base.getDate() + i * 7);
                else if (recurrenceFreq === "BIWEEKLY")
                  d.setDate(base.getDate() + i * 14);
                else d.setMonth(base.getMonth() + i);
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 font-sans text-sm"
                  >
                    <span className="font-display italic text-xs text-ink-500 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ink-900">
                      {d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: service.provider.timezone,
                      })}
                    </span>
                    <span className="text-ink-500">
                      {formatTime(d.toISOString(), service.provider.timezone)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
