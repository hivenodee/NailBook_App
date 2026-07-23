"use client";

import * as React from "react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const AvatarCropModal = React.lazy(() => import("@/components/AvatarCropModal"));
const CoverCropModal = React.lazy(() => import("@/components/CoverCropModal"));

const MAX_BIO = 500;

export function StepPhotoBio({
  coverImageUrl,
  avatarUrl,
  bio,
  onChange,
  onNext,
  submitting,
  submitError,
}: {
  coverImageUrl: string | null;
  avatarUrl: string | null;
  bio: string;
  onChange: (next: { coverImageUrl?: string | null; avatarUrl?: string | null; bio?: string }) => void;
  onNext: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}): React.JSX.Element {
  const [avatarCropSrc, setAvatarCropSrc] = React.useState<string | null>(null);
  const [coverCropSrc, setCoverCropSrc] = React.useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  function pickAvatar(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Avatar must be under 5MB.");
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => setAvatarCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function pickCover(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Cover must be under 10MB.");
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => setCoverCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(blob: Blob) {
    setAvatarCropSrc(null);
    setAvatarUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/providers/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg", fileSize: blob.size }),
      });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error?.message || "Avatar upload failed");
        return;
      }
      const putRes = await fetch(json.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putRes.ok) {
        setUploadError("Upload to storage failed");
        return;
      }
      onChange({ avatarUrl: json.data.avatarUrl + "?t=" + Date.now() });
    } catch {
      setUploadError("Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function uploadCover(blob: Blob) {
    setCoverCropSrc(null);
    setCoverUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/providers/me/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg", fileSize: blob.size }),
      });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error?.message || "Cover upload failed");
        return;
      }
      const putRes = await fetch(json.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putRes.ok) {
        setUploadError("Upload to storage failed");
        return;
      }
      onChange({ coverImageUrl: json.data.coverImageUrl + "?t=" + Date.now() });
    } catch {
      setUploadError("Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  }

  const bioRemaining = MAX_BIO - bio.length;
  const canContinue = !!avatarUrl && bio.trim().length >= 20 && !submitting;

  return (
    <div className="flex flex-col gap-8">
      {/* Cover + avatar composite */}
      <div className="relative">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className={cn(
            "relative w-full aspect-[3/1] overflow-hidden rounded-md border border-ink-200 bg-cream-100",
            "transition-all duration-200 hover:border-ink-400",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
          )}
          aria-label={coverImageUrl ? "Replace cover photo" : "Add cover photo"}
        >
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-500">
              <ImagePlus size={28} strokeWidth={1.5} />
              <span className="font-sans text-sm">
                {coverUploading ? "Uploading…" : "Add cover photo"}
              </span>
              <span className="font-sans text-xs text-ink-400">
                Wide shot — work, space, or vibe
              </span>
            </div>
          )}
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickCover(f);
            e.target.value = "";
          }}
        />

        {/* Avatar overlapping bottom of cover */}
        <div className="absolute -bottom-10 left-6 sm:left-8">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className={cn(
              "relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-pill border-4 border-cream-50 bg-cream-100",
              "transition-all duration-200 hover:-translate-y-px",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
            )}
            aria-label={avatarUrl ? "Replace profile photo" : "Add profile photo"}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-ink-500">
                <Camera size={20} strokeWidth={1.5} />
              </span>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickAvatar(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Spacer for the overlapping avatar */}
      <div className="h-6" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="onboarding-bio" className="text-sm font-sans font-medium text-ink-700">
          Bio
        </label>
        <textarea
          id="onboarding-bio"
          value={bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, MAX_BIO) })}
          placeholder="A line or two on who you are, what you do, and what to expect. Clients pick a vibe, not a resume."
          rows={4}
          className={cn(
            "px-4 py-3 text-base font-sans text-ink-900",
            "bg-cream-50 border border-ink-300 rounded-md",
            "placeholder:text-ink-300",
            "transition-colors duration-200 resize-none",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
            "hover:border-ink-500",
          )}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans text-ink-500">
            {bio.trim().length < 20
              ? `At least 20 characters (${20 - bio.trim().length} to go)`
              : "Looks good."}
          </p>
          <p
            className={cn(
              "text-xs font-sans tabular-nums",
              bioRemaining < 40 ? "text-ink-700" : "text-ink-400",
            )}
          >
            {bioRemaining}
          </p>
        </div>
      </div>

      {uploadError && (
        <p className="text-sm font-sans text-error" role="alert">{uploadError}</p>
      )}
      {submitError && (
        <p className="text-sm font-sans text-error" role="alert">{submitError}</p>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canContinue}
          aria-label="Continue to your first service"
        >
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>

      {avatarCropSrc && (
        <React.Suspense fallback={null}>
          <AvatarCropModal
            imageSrc={avatarCropSrc}
            onCropComplete={uploadAvatar}
            onCancel={() => setAvatarCropSrc(null)}
          />
        </React.Suspense>
      )}
      {coverCropSrc && (
        <React.Suspense fallback={null}>
          <CoverCropModal
            imageSrc={coverCropSrc}
            onCropComplete={uploadCover}
            onCancel={() => setCoverCropSrc(null)}
          />
        </React.Suspense>
      )}

      {(avatarUploading || coverUploading) && (
        <div className="text-xs font-sans text-ink-500" aria-live="polite">
          Uploading photo…
        </div>
      )}
    </div>
  );
}
