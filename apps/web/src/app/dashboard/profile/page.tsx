"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, Image as ImageIcon, ShieldCheck, ExternalLink, Trash2 } from "lucide-react";
import AvatarCropModal from "@/components/AvatarCropModal";
import CoverCropModal from "@/components/CoverCropModal";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type ProviderData = {
  id: string;
  businessName: string;
  bio: string | null;
  category: string;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
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
  bufferMinutes: number;
  avatarUrl: string | null;
  updatedAt?: string;
};

const CATEGORY_PRESETS = [
  { value: "NAILS",         label: "Nails" },
  { value: "HAIR",          label: "Hair" },
  { value: "ESTHETICS",     label: "Estheticians" },
  { value: "BROWS_LASHES",  label: "Brows & lashes" },
  { value: "MASSAGE",       label: "Massage" },
  { value: "OTHER",         label: "Other" },
];

const WINDOW_PRESETS = [
  { label: "1 week",   days: 7   },
  { label: "2 weeks",  days: 14  },
  { label: "1 month",  days: 30  },
  { label: "3 months", days: 90  },
  { label: "1 year",   days: 365 },
];

const BUFFER_PRESETS = [
  { label: "None",   minutes: 0  },
  { label: "5 min",  minutes: 5  },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
];

export default function ProfilePage(): React.JSX.Element {
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Photo state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Public profile form state
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("NAILS");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  // Payment + booking + policies (preserved from existing functionality)
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
  const [bufferMinutes, setBufferMinutes] = useState(0);

  // Notification preference stubs (UI only — no backend yet, see flag)
  const [notifyEmailBookings, setNotifyEmailBookings] = useState(true);
  const [notifyEmailReminders, setNotifyEmailReminders] = useState(true);
  const [notifyEmailMarketing, setNotifyEmailMarketing] = useState(false);

  // Capture initial state to compute dirty flag.
  const [initial, setInitial] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/providers/me");
        const json = await res.json();
        if (json.data) {
          const p = json.data as ProviderData;
          setProvider(p);
          setAvatarUrl(p.avatarUrl || null);
          setCoverUrl(p.coverImageUrl || null);
          setBusinessName(p.businessName);
          setBio(p.bio || "");
          setCategory(p.category || "NAILS");
          setLocationAddress(p.locationAddress || "");
          setLocationLat(p.locationLat);
          setLocationLng(p.locationLng);
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
          setBufferMinutes(p.bufferMinutes ?? 0);
          if (p.booksOpenAt) {
            const dt = new Date(p.booksOpenAt);
            setBooksOpenAtDate(dt.toISOString().split("T")[0]);
            setBooksOpenAtTime(dt.toTimeString().slice(0, 5));
          }
          setInitial(JSON.stringify(snapshot(p)));
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const current = useMemo(
    () => ({
      businessName, bio, category,
      locationAddress, locationLat, locationLng,
      instagramUrl, tiktokUrl,
      acceptsCard, acceptsApplePay, acceptsGooglePay, acceptsCashAppPay, acceptsCash,
      cancellationHours, arrivalGraceMinutes,
      booksOpen, booksOpenAtDate, booksOpenAtTime,
      bookingWindowDays, bufferMinutes,
    }),
    [
      businessName, bio, category,
      locationAddress, locationLat, locationLng,
      instagramUrl, tiktokUrl,
      acceptsCard, acceptsApplePay, acceptsGooglePay, acceptsCashAppPay, acceptsCash,
      cancellationHours, arrivalGraceMinutes,
      booksOpen, booksOpenAtDate, booksOpenAtTime,
      bookingWindowDays, bufferMinutes,
    ],
  );

  const isDirty = initial !== "" && JSON.stringify(current) !== initial;

  async function handleAvatarUpload(blob: Blob) {
    setCropImageSrc(null);
    setAvatarUploading(true);
    setErrorMsg(null);
    try {
      const contentType = "image/jpeg";
      const res = await fetch("/api/providers/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Upload failed");
        return;
      }
      await fetch(json.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      setAvatarUrl(json.data.avatarUrl + "?t=" + Date.now());
    } catch (e) {
      console.error("Avatar upload failed:", e);
      setErrorMsg("Failed to upload photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  // Step 1: when a file is picked, validate size + open the crop modal.
  // Actual upload doesn't happen until the user confirms the crop.
  function handleCoverPicked(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Cover image is too large. Max 10MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => setCoverCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Step 2: cropper returns a JPEG blob (always image/jpeg per CoverCropModal).
  async function uploadCoverBlob(blob: Blob) {
    setCoverCropSrc(null);
    setCoverUploading(true);
    setErrorMsg(null);
    try {
      // Cropper always outputs JPEG.
      const contentType = "image/jpeg";
      const res = await fetch("/api/providers/me/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, fileSize: blob.size }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Upload failed");
        return;
      }
      const putRes = await fetch(json.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!putRes.ok) {
        setErrorMsg("Upload to storage failed. Please try again.");
        return;
      }
      setCoverUrl(json.data.coverImageUrl + "?t=" + Date.now());
    } catch (e) {
      console.error("Cover upload failed:", e);
      setErrorMsg("Failed to upload cover. Please try again.");
    } finally {
      setCoverUploading(false);
    }
  }

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
          category,
          locationAddress: locationAddress || null,
          locationLat,
          locationLng,
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
          bufferMinutes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Save failed");
        return;
      }
      setSaved(true);
      setInitial(JSON.stringify(current));
      setTimeout(() => setSaved(false), 2400);
    } catch (e) {
      console.error("Save failed:", e);
      setErrorMsg("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-8">
        <div className="h-12 w-32 skeleton-shimmer rounded-md" />
        <div className="h-48 skeleton-shimmer rounded-md" />
        <div className="h-64 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  if (!provider) {
    return <div className="text-sm text-ink-500">Provider not found.</div>;
  }

  return (
    <div className="pb-32">
      <div className="max-w-3xl space-y-12">
        <header className="flex items-baseline gap-4">
          <Heading variant="display" className="text-3xl sm:text-4xl">Profile</Heading>
          {provider.isVerified && (
            <Badge variant="verified" className="self-center">
              <ShieldCheck size={12} aria-hidden="true" />
              Verified
            </Badge>
          )}
        </header>

        {/* ─────────────────────────── SECTION 1 ─────────────────────────── */}
        <section className="space-y-8">
          <SectionHeader
            eyebrow="01 — Public profile"
            title="What clients see"
            description="Your cover, photo, name, story, and where to find you."
          />

          {/* Cover image — preview matches public profile aspect (3:1 desktop, 2:1 mobile). */}
          <Card padding="none" className="overflow-hidden">
            <div className="relative aspect-[2/1] sm:aspect-[3/1] w-full bg-cream-100">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-300">
                  <ImageIcon size={32} aria-hidden="true" />
                  <span className="text-sm font-sans">No cover yet</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 via-transparent to-transparent" />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-pill bg-cream-50/95 backdrop-blur px-4 py-2 text-sm font-sans font-medium text-ink-900 border border-ink-200 hover:border-ink-500 transition-colors disabled:opacity-50"
              >
                <Camera size={14} aria-hidden="true" />
                {coverUploading ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverPicked(file);
                  e.target.value = "";
                }}
              />
            </div>
          </Card>

          {/* Profile photo + business name */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <div className="relative h-[96px] w-[96px] rounded-pill overflow-hidden ring-2 ring-rust-500 ring-offset-4 ring-offset-cream-50 bg-cream-100">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-display text-ink-700">
                      {businessName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 h-11 w-11 sm:h-9 sm:w-9 rounded-pill bg-rust-500 text-cream-50 inline-flex items-center justify-center shadow-soft hover:bg-rust-600 transition-colors disabled:opacity-50"
                >
                  <Camera size={14} aria-hidden="true" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        setErrorMsg("File is too large. Max 10MB.");
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setCropImageSrc(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-sm font-sans font-medium text-rust-500 hover:text-rust-600 transition-colors disabled:opacity-50"
                >
                  {avatarUploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                <p className="text-xs font-sans text-ink-500">
                  JPEG, PNG, or WebP. Max 10MB. We'll crop it square.
                </p>
              </div>
            </div>
          </Card>

          {cropImageSrc && (
            <AvatarCropModal
              imageSrc={cropImageSrc}
              onCropComplete={handleAvatarUpload}
              onCancel={() => setCropImageSrc(null)}
            />
          )}

          {coverCropSrc && (
            <CoverCropModal
              imageSrc={coverCropSrc}
              onCropComplete={uploadCoverBlob}
              onCancel={() => setCoverCropSrc(null)}
            />
          )}

          {/* Business details */}
          <Card padding="lg" className="space-y-6">
            <Input
              label="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={100}
              helper="Shown at the top of your public page."
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="text-sm font-sans font-medium text-ink-700">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="A few sentences about your work and how you take care of clients."
                className="px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 transition-colors duration-200 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-none"
              />
              <div className="flex justify-between text-xs font-sans text-ink-500">
                <span>Two or three sentences works well.</span>
                <span>{bio.length}/500</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-ink-700">
                Specialty
              </label>
              <p className="text-xs font-sans text-ink-500">
                Pick one. Multi-select specialties are coming.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORY_PRESETS.map((preset) => {
                  const active = category === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setCategory(preset.value)}
                      className={
                        active
                          ? "rounded-pill px-4 py-1.5 text-sm font-sans font-medium bg-rust-500 text-cream-50 border border-rust-500 transition-colors"
                          : "rounded-pill px-4 py-1.5 text-sm font-sans font-medium bg-cream-50 text-ink-700 border border-ink-200 hover:border-ink-500 transition-colors"
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card padding="lg" className="space-y-6">
            <div>
              <Heading variant="h4" className="text-lg">Location</Heading>
              <p className="text-sm font-sans text-ink-500 mt-1">
                Address shown on your page; lat/lng powers nearby search.
              </p>
            </div>

            <Input
              label="Street address"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              maxLength={200}
              placeholder="123 Main St, City, ST"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={locationLat ?? ""}
                onChange={(e) => setLocationLat(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="40.7128"
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={locationLng ?? ""}
                onChange={(e) => setLocationLng(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-74.0060"
              />
            </div>
          </Card>

          {/* Social links */}
          <Card padding="lg" className="space-y-6">
            <div>
              <Heading variant="h4" className="text-lg">Social links</Heading>
              <p className="text-sm font-sans text-ink-500 mt-1">
                Optional. Linked from your public page.
              </p>
            </div>

            <Input
              label="Instagram"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
            />
            <Input
              label="TikTok"
              type="url"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@yourhandle"
            />
          </Card>

          {/* Booking preferences (preserved from existing) */}
          <Card padding="lg" className="space-y-8">
            <div>
              <Heading variant="h4" className="text-lg">Booking preferences</Heading>
              <p className="text-sm font-sans text-ink-500 mt-1">
                What clients can book and how far ahead.
              </p>
            </div>

            <Toggle
              label="Books are open"
              description={booksOpen ? "Clients can book appointments." : "Booking is paused."}
              checked={booksOpen}
              onChange={(val) => {
                setBooksOpen(val);
                if (val) {
                  setBooksOpenAtDate("");
                  setBooksOpenAtTime("");
                }
              }}
            />

            {!booksOpen && (
              <div className="space-y-3 pt-2 border-t border-ink-100">
                <div>
                  <p className="text-sm font-sans font-medium text-ink-900">Schedule opening</p>
                  <p className="text-xs font-sans text-ink-500 mt-0.5">
                    Books reopen automatically at this time.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Date"
                    type="date"
                    value={booksOpenAtDate}
                    onChange={(e) => setBooksOpenAtDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={booksOpenAtTime}
                    onChange={(e) => setBooksOpenAtTime(e.target.value)}
                  />
                </div>
                {booksOpenAtDate && booksOpenAtTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setBooksOpenAtDate("");
                      setBooksOpenAtTime("");
                    }}
                    className="text-xs font-sans font-medium text-rust-500 hover:text-rust-600 transition-colors"
                  >
                    Clear schedule
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-ink-100">
              <div>
                <p className="text-sm font-sans font-medium text-ink-900">Booking window</p>
                <p className="text-xs font-sans text-ink-500 mt-0.5">
                  How far ahead clients can book.
                </p>
              </div>
              <ChipRow
                options={WINDOW_PRESETS.map((p) => ({ key: p.days, label: p.label }))}
                selected={bookingWindowDays}
                onSelect={setBookingWindowDays}
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-ink-100">
              <div>
                <p className="text-sm font-sans font-medium text-ink-900">Buffer between appointments</p>
                <p className="text-xs font-sans text-ink-500 mt-0.5">
                  Cleanup or prep time between back-to-back bookings.
                </p>
              </div>
              <ChipRow
                options={BUFFER_PRESETS.map((p) => ({ key: p.minutes, label: p.label }))}
                selected={bufferMinutes}
                onSelect={setBufferMinutes}
              />
            </div>
          </Card>

          {/* Payment methods */}
          <Card padding="lg" className="space-y-5">
            <div>
              <Heading variant="h4" className="text-lg">Payment methods</Heading>
              <p className="text-sm font-sans text-ink-500 mt-1">
                Which methods clients can use to pay.
              </p>
            </div>
            <div className="space-y-4">
              <Toggle label="Card"         checked={acceptsCard}       onChange={setAcceptsCard} />
              <Toggle label="Apple Pay"    checked={acceptsApplePay}   onChange={setAcceptsApplePay} />
              <Toggle label="Google Pay"   checked={acceptsGooglePay}  onChange={setAcceptsGooglePay} />
              <Toggle label="Cash App Pay" checked={acceptsCashAppPay} onChange={setAcceptsCashAppPay} />
              <Toggle label="Cash"         checked={acceptsCash}       onChange={setAcceptsCash} />
            </div>
          </Card>

          {/* Policies */}
          <Card padding="lg" className="space-y-6">
            <div>
              <Heading variant="h4" className="text-lg">Policies</Heading>
              <p className="text-sm font-sans text-ink-500 mt-1">
                What clients agree to when they book.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cancellation window (hours)"
                type="number"
                min={0}
                max={168}
                value={cancellationHours}
                onChange={(e) =>
                  setCancellationHours(Math.max(0, Math.min(168, parseInt(e.target.value) || 0)))
                }
                helper="Clients must cancel at least this many hours ahead."
              />
              <Input
                label="Arrival grace (minutes)"
                type="number"
                min={0}
                max={60}
                value={arrivalGraceMinutes}
                onChange={(e) =>
                  setArrivalGraceMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))
                }
                helper="How late before a client is marked no-show."
              />
            </div>
          </Card>
        </section>

        {/* ─────────────────────────── SECTION 2 ─────────────────────────── */}
        <section className="space-y-8">
          <SectionHeader
            eyebrow="02 — Account settings"
            title="Sign in and notifications"
            description="Email, password, and what we send you."
          />

          <Card padding="lg" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-ink-100">
              <div>
                <p className="text-sm font-sans font-medium text-ink-900">Email & password</p>
                <p className="text-xs font-sans text-ink-500 mt-0.5">
                  Managed in your sign-in account.
                </p>
              </div>
              <a
                href="/user-profile"
                className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-rust-500 hover:text-rust-600 transition-colors"
              >
                Manage account
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-sans font-medium text-ink-900">Email notifications</p>
              <p className="text-xs font-sans text-ink-500">
                Stub — preferences here aren't persisted yet.
              </p>
            </div>
            <div className="space-y-4">
              <Toggle
                label="New bookings"
                description="When a client books or pays a deposit."
                checked={notifyEmailBookings}
                onChange={setNotifyEmailBookings}
              />
              <Toggle
                label="Reminders"
                description="Day-before reminders for upcoming appointments."
                checked={notifyEmailReminders}
                onChange={setNotifyEmailReminders}
              />
              <Toggle
                label="Tips & product updates"
                description="Occasional notes from us. Off by default."
                checked={notifyEmailMarketing}
                onChange={setNotifyEmailMarketing}
              />
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-sans font-medium text-ink-900">Delete account</p>
                <p className="text-xs font-sans text-ink-500 mt-0.5">
                  Permanently removes your profile, services, and history.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  alert(
                    "Account deletion is handled by support. Please email us to request deletion.",
                  )
                }
                className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-ink-500 hover:text-error transition-colors"
              >
                <Trash2 size={12} aria-hidden="true" />
                Delete account
              </button>
            </div>
          </Card>
        </section>

        {/* ─────────────────────────── SECTION 3 ─────────────────────────── */}
        <section className="space-y-8">
          <SectionHeader
            eyebrow="03 — Verification"
            title="Verified badge"
            description="Confirm your identity to earn the verified mark on your profile."
          />

          <Card padding="lg">
            {provider.isVerified ? (
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-pill bg-success/10 text-success inline-flex items-center justify-center shrink-0">
                  <Check size={18} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-sans font-medium text-ink-900">You're verified</p>
                    <Badge variant="verified">
                      <ShieldCheck size={12} aria-hidden="true" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-sm font-sans text-ink-500 mt-1">
                    {provider.updatedAt
                      ? `Verified on ${new Date(provider.updatedAt).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}.`
                      : "Your verified badge is live on your public profile."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-pill bg-cream-100 text-ink-700 inline-flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-sans font-medium text-ink-900">
                      Get the verified badge
                    </p>
                    <p className="text-sm font-sans text-ink-500 mt-1">
                      Verified providers get a badge on their public profile and rank higher in
                      discovery. We'll ask for a government ID and a quick selfie. Most reviews
                      finish within 48 hours.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() =>
                    alert(
                      "Verification is currently admin-reviewed. Please email us with your ID and a selfie to start the process.",
                    )
                  }
                >
                  Start verification
                </Button>
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Sticky save bar — activates only when changes exist */}
      <div
        className={
          "fixed left-0 right-0 bottom-0 sm:bottom-6 sm:left-auto sm:right-6 z-30 transition-all duration-200 " +
          (isDirty
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0 pointer-events-none")
        }
      >
        <div className="sm:max-w-md mx-auto sm:mx-0">
          <div className="bg-cream-50 border-t sm:border border-ink-200 sm:rounded-md sm:shadow-soft px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {errorMsg ? (
                <p className="text-sm font-sans text-error truncate">{errorMsg}</p>
              ) : saved ? (
                <p className="text-sm font-sans text-success inline-flex items-center gap-1.5">
                  <Check size={14} aria-hidden="true" />
                  Saved
                </p>
              ) : (
                <p className="text-sm font-sans text-ink-500">Unsaved changes</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Reset to last-saved snapshot.
                  if (provider) {
                    const p = provider;
                    setBusinessName(p.businessName);
                    setBio(p.bio || "");
                    setCategory(p.category || "NAILS");
                    setLocationAddress(p.locationAddress || "");
                    setLocationLat(p.locationLat);
                    setLocationLng(p.locationLng);
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
                    setBufferMinutes(p.bufferMinutes ?? 0);
                    if (p.booksOpenAt) {
                      const dt = new Date(p.booksOpenAt);
                      setBooksOpenAtDate(dt.toISOString().split("T")[0]);
                      setBooksOpenAtTime(dt.toTimeString().slice(0, 5));
                    } else {
                      setBooksOpenAtDate("");
                      setBooksOpenAtTime("");
                    }
                  }
                  setErrorMsg(null);
                }}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || !businessName.trim()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── helpers ──────────────────────────── */

function snapshot(p: ProviderData) {
  return {
    businessName: p.businessName,
    bio: p.bio || "",
    category: p.category || "NAILS",
    locationAddress: p.locationAddress || "",
    locationLat: p.locationLat,
    locationLng: p.locationLng,
    instagramUrl: p.instagramUrl || "",
    tiktokUrl: p.tiktokUrl || "",
    acceptsCard: p.acceptsCard,
    acceptsApplePay: p.acceptsApplePay,
    acceptsGooglePay: p.acceptsGooglePay,
    acceptsCashAppPay: p.acceptsCashAppPay,
    acceptsCash: p.acceptsCash,
    cancellationHours: p.cancellationHours,
    arrivalGraceMinutes: p.arrivalGraceMinutes,
    booksOpen: p.booksOpen,
    booksOpenAtDate: p.booksOpenAt ? new Date(p.booksOpenAt).toISOString().split("T")[0] : "",
    booksOpenAtTime: p.booksOpenAt ? new Date(p.booksOpenAt).toTimeString().slice(0, 5) : "",
    bookingWindowDays: p.bookingWindowDays,
    bufferMinutes: p.bufferMinutes ?? 0,
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-rust-500" aria-hidden="true" />
        <p className="text-xs font-sans font-medium tracking-widest uppercase text-rust-500">
          {eyebrow}
        </p>
      </div>
      <Heading variant="h2" className="text-3xl">{title}</Heading>
      <p className="text-base font-sans text-ink-500 max-w-xl">{description}</p>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-sans font-medium text-ink-900">{label}</p>
        {description && (
          <p className="text-xs font-sans text-ink-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={
          "relative h-6 w-11 rounded-pill transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 " +
          (checked ? "bg-rust-500" : "bg-ink-200")
        }
      >
        <span
          className={
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-pill bg-cream-50 shadow-sm transition-transform " +
            (checked ? "translate-x-5" : "translate-x-0")
          }
        />
      </button>
    </div>
  );
}

function ChipRow<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (val: T) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <button
            key={String(o.key)}
            type="button"
            onClick={() => onSelect(o.key)}
            className={
              active
                ? "rounded-pill px-4 py-1.5 text-sm font-sans font-medium bg-rust-500 text-cream-50 border border-rust-500 transition-colors"
                : "rounded-pill px-4 py-1.5 text-sm font-sans font-medium bg-cream-50 text-ink-700 border border-ink-200 hover:border-ink-500 transition-colors"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
