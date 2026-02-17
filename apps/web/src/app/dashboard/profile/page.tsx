"use client";

import React, { useEffect, useState } from "react";

type ProviderData = {
  id: string;
  businessName: string;
  bio: string | null;
  locationAddress: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  acceptsCard: boolean;
  acceptsApplePay: boolean;
  acceptsGooglePay: boolean;
  acceptsCashAppPay: boolean;
  acceptsCash: boolean;
  cancellationHours: number;
  arrivalGraceMinutes: number;
  booksOpen: boolean;
  booksOpenAt: string | null;
  bookingWindowDays: number;
};

const WINDOW_PRESETS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "1 Year", days: 365 },
];

export default function ProfilePage() {
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [acceptsCard, setAcceptsCard] = useState(true);
  const [acceptsApplePay, setAcceptsApplePay] = useState(false);
  const [acceptsGooglePay, setAcceptsGooglePay] = useState(false);
  const [acceptsCashAppPay, setAcceptsCashAppPay] = useState(false);
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [arrivalGraceMinutes, setArrivalGraceMinutes] = useState(15);
  const [booksOpen, setBooksOpen] = useState(true);
  const [booksOpenAtDate, setBooksOpenAtDate] = useState("");
  const [booksOpenAtTime, setBooksOpenAtTime] = useState("");
  const [bookingWindowDays, setBookingWindowDays] = useState(30);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/providers/me");
        const json = await res.json();
        if (json.data) {
          const p = json.data as ProviderData;
          setProvider(p);
          setBusinessName(p.businessName);
          setBio(p.bio || "");
          setLocationAddress(p.locationAddress || "");
          setInstagramUrl(p.instagramUrl || "");
          setTiktokUrl(p.tiktokUrl || "");
          setAcceptsCard(p.acceptsCard);
          setAcceptsApplePay(p.acceptsApplePay);
          setAcceptsGooglePay(p.acceptsGooglePay);
          setAcceptsCashAppPay(p.acceptsCashAppPay);
          setAcceptsCash(p.acceptsCash);
          setCancellationHours(p.cancellationHours);
          setArrivalGraceMinutes(p.arrivalGraceMinutes);
          setBooksOpen(p.booksOpen);
          setBookingWindowDays(p.bookingWindowDays);
          if (p.booksOpenAt) {
            const dt = new Date(p.booksOpenAt);
            setBooksOpenAtDate(dt.toISOString().split("T")[0]);
            setBooksOpenAtTime(dt.toTimeString().slice(0, 5));
          }
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/providers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          bio: bio || null,
          locationAddress: locationAddress || null,
          instagramUrl: instagramUrl || null,
          tiktokUrl: tiktokUrl || null,
          acceptsCard,
          acceptsApplePay,
          acceptsGooglePay,
          acceptsCashAppPay,
          acceptsCash,
          cancellationHours,
          arrivalGraceMinutes,
          booksOpen,
          booksOpenAt: !booksOpen && booksOpenAtDate && booksOpenAtTime
            ? new Date(`${booksOpenAtDate}T${booksOpenAtTime}:00`).toISOString()
            : null,
          bookingWindowDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save failed:", e);
      setErrorMsg("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-grid-3 max-w-lg">
        <div className="h-7 bg-border/60 rounded w-20" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse space-y-grid-2">
            <div className="h-5 bg-border/60 rounded w-28" />
            <div className="space-y-2">
              <div className="h-3 bg-border/40 rounded w-20" />
              <div className="h-9 bg-border/30 rounded-button w-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-border/40 rounded w-16" />
              <div className="h-9 bg-border/30 rounded-button w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!provider) {
    return <div className="text-text-muted text-sm">Provider not found.</div>;
  }

  return (
    <div className="space-y-grid-3 max-w-lg">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* Profile info */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <h2 className="text-lg font-medium">Business Info</h2>

        <Field label="Business Name">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={100}
            className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-xs text-text-muted mt-0.5">{bio.length}/500</p>
        </Field>

        <Field label="Location">
          <input
            type="text"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            maxLength={200}
            placeholder="123 Main St, City, ST"
            className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </section>

      {/* Social links */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <h2 className="text-lg font-medium">Social Links</h2>

        <Field label="Instagram URL">
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>

        <Field label="TikTok URL">
          <input
            type="url"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@yourhandle"
            className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </section>

      {/* Payment methods */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <h2 className="text-lg font-medium">Payment Methods</h2>
        <p className="text-text-muted text-xs">Choose which payment methods your clients can use.</p>

        <Toggle label="Card" checked={acceptsCard} onChange={setAcceptsCard} />
        <Toggle label="Apple Pay" checked={acceptsApplePay} onChange={setAcceptsApplePay} />
        <Toggle label="Google Pay" checked={acceptsGooglePay} onChange={setAcceptsGooglePay} />
        <Toggle label="Cash App Pay" checked={acceptsCashAppPay} onChange={setAcceptsCashAppPay} />
        <Toggle label="Cash" checked={acceptsCash} onChange={setAcceptsCash} />
      </section>

      {/* Booking Controls */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <h2 className="text-lg font-medium">Booking Controls</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Books Status</p>
            <p className="text-xs text-text-muted">
              {booksOpen ? "Clients can book appointments" : "Booking is paused"}
            </p>
          </div>
          <Toggle
            label={booksOpen ? "Open" : "Closed"}
            checked={booksOpen}
            onChange={(val) => {
              setBooksOpen(val);
              if (val) {
                setBooksOpenAtDate("");
                setBooksOpenAtTime("");
              }
            }}
          />
        </div>

        {!booksOpen && (
          <div className="border-t border-border pt-grid-2 space-y-grid-2">
            <p className="text-sm font-medium">Schedule Opening</p>
            <p className="text-xs text-text-muted">
              Set a date and time for your books to automatically open.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-0.5">Date</label>
                <input
                  type="date"
                  value={booksOpenAtDate}
                  onChange={(e) => setBooksOpenAtDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-0.5">Time</label>
                <input
                  type="time"
                  value={booksOpenAtTime}
                  onChange={(e) => setBooksOpenAtTime(e.target.value)}
                  className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            {booksOpenAtDate && booksOpenAtTime && (
              <button
                type="button"
                onClick={() => {
                  setBooksOpenAtDate("");
                  setBooksOpenAtTime("");
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Clear schedule
              </button>
            )}
          </div>
        )}

        <div className="border-t border-border pt-grid-2 space-y-grid-1">
          <p className="text-sm font-medium">Booking Window</p>
          <p className="text-xs text-text-muted">How far ahead can clients book?</p>
          <div className="flex flex-wrap gap-2">
            {WINDOW_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setBookingWindowDays(preset.days)}
                className={`px-3 py-1.5 rounded-button text-sm font-medium transition-colors border ${
                  bookingWindowDays === preset.days
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-text-secondary hover:border-primary/40"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <h2 className="text-lg font-medium">Policies</h2>

        <Field label="Cancellation window (hours)">
          <input
            type="number"
            value={cancellationHours}
            onChange={(e) => setCancellationHours(Math.max(0, Math.min(168, parseInt(e.target.value) || 0)))}
            min={0}
            max={168}
            className="w-24 border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-text-muted mt-0.5">
            Clients must cancel at least this many hours in advance.
          </p>
        </Field>

        <Field label="Arrival grace period (minutes)">
          <input
            type="number"
            value={arrivalGraceMinutes}
            onChange={(e) => setArrivalGraceMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
            min={0}
            max={60}
            className="w-24 border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-text-muted mt-0.5">
            How late a client can arrive before being marked as a no-show.
          </p>
        </Field>
      </section>

      {/* Save */}
      <div className="flex items-center gap-grid-2">
        <button
          onClick={handleSave}
          disabled={saving || !businessName.trim()}
          className="bg-primary text-white py-3 px-6 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved</span>
        )}
        {errorMsg && (
          <span className="text-sm text-red-600 font-medium">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
