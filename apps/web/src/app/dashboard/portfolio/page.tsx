"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { MEDIA_LIMITS } from "@nailbook/shared";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { PortfolioEmptyArt } from "@/components/ui/empty-art/PortfolioEmptyArt";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type MediaAsset = {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
};

// ─── Page ──────────────────────────────────────────────────

export default function PortfolioPage(): React.JSX.Element {
  const [media, setMedia] = React.useState<MediaAsset[]>([]);
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploadProgress, setUploadProgress] = React.useState<{
    current: number;
    total: number;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadMedia = React.useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/media?providerId=${pid}`);
      const json = await res.json();
      setMedia(json.data || []);
    } catch (e) {
      console.error("Failed to load media:", e);
    }
  }, []);

  React.useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/providers/me");
        const json = await res.json();
        if (json.data?.id) {
          setProviderId(json.data.id);
          await loadMedia(json.data.id);
        }
      } catch (e) {
        console.error("Failed to load provider:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadMedia]);

  function isAllowedFile(file: File): boolean {
    return (
      MEDIA_LIMITS.ALLOWED_IMAGE_TYPES.includes(
        file.type as (typeof MEDIA_LIMITS.ALLOWED_IMAGE_TYPES)[number],
      ) ||
      MEDIA_LIMITS.ALLOWED_VIDEO_TYPES.includes(
        file.type as (typeof MEDIA_LIMITS.ALLOWED_VIDEO_TYPES)[number],
      )
    );
  }

  async function uploadOne(file: File): Promise<void> {
    if (file.size > MEDIA_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new Error(`${file.name} is too large. Max 10MB.`);
    }
    if (!isAllowedFile(file)) {
      throw new Error(`${file.name} type isn't supported.`);
    }
    const isImage = MEDIA_LIMITS.ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof MEDIA_LIMITS.ALLOWED_IMAGE_TYPES)[number],
    );
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        type: isImage ? "PHOTO" : "VIDEO",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Upload failed");
    const { uploadUrl } = json.data;
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0 || !providerId) return;

    setUploadProgress({ current: 0, total: list.length });
    try {
      for (let i = 0; i < list.length; i++) {
        setUploadProgress({ current: i + 1, total: list.length });
        try {
          await uploadOne(list[i]);
        } catch (e) {
          alert(
            e instanceof Error ? e.message : "One of the files failed to upload.",
          );
        }
      }
      await loadMedia(providerId);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleHidden(asset: MediaAsset) {
    // Optimistic
    setMedia((prev) =>
      prev.map((a) =>
        a.id === asset.id ? { ...a, isHidden: !a.isHidden } : a,
      ),
    );
    try {
      await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !asset.isHidden }),
      });
    } catch (e) {
      console.error("Failed to toggle hidden:", e);
      if (providerId) await loadMedia(providerId);
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    if (!confirm("Delete this item? This can't be undone.")) return;
    setMedia((prev) => prev.filter((a) => a.id !== asset.id));
    try {
      await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete:", e);
      if (providerId) await loadMedia(providerId);
    }
  }

  const isUploading = uploadProgress !== null;
  const isEmpty = !loading && media.length === 0;
  const photoCount = media.filter((m) => m.type === "PHOTO").length;
  const videoCount = media.filter((m) => m.type === "VIDEO").length;
  const subhead =
    photoCount + videoCount === 0
      ? "Photos clients see when deciding to book."
      : `${photoCount} photo${photoCount !== 1 ? "s" : ""}${
          videoCount > 0
            ? ` · ${videoCount} video${videoCount !== 1 ? "s" : ""}`
            : ""
        }`;

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Heading variant="display" className="text-3xl md:text-4xl">
            Portfolio
          </Heading>
          <p className="font-sans text-sm text-ink-500">
            {loading ? "Loading…" : subhead}
          </p>
        </div>

        {!isEmpty && (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={openFilePicker}
            disabled={isUploading}
            className="gap-2"
          >
            <Plus size={16} strokeWidth={1.75} />
            {isUploading
              ? `Uploading ${uploadProgress!.current} of ${uploadProgress!.total}`
              : "Upload photos"}
          </Button>
        )}
      </header>

      {/* Hidden multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[
          ...MEDIA_LIMITS.ALLOWED_IMAGE_TYPES,
          ...MEDIA_LIMITS.ALLOWED_VIDEO_TYPES,
        ].join(",")}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
        className="hidden"
      />

      {/* ─── Body ─── */}
      <Dropzone onFiles={handleFiles} disabled={isUploading}>
        {loading ? (
          <Skeleton />
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-ink-200">
            <EmptyState
              customArt={<PortfolioEmptyArt className="text-rust-500" />}
              title="Your portfolio is empty"
              description="Photos help clients decide. Upload your best work to attract more bookings."
              action={{
                label: "Upload first photo",
                onClick: openFilePicker,
              }}
            />
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-3">
            {media.map((asset) => (
              <PhotoTile
                key={asset.id}
                asset={asset}
                onToggleHidden={() => toggleHidden(asset)}
                onDelete={() => deleteAsset(asset)}
              />
            ))}
          </div>
        )}
      </Dropzone>
    </div>
  );
}

// ─── Photo tile ────────────────────────────────────────────

function PhotoTile({
  asset,
  onToggleHidden,
  onDelete,
}: {
  asset: MediaAsset;
  onToggleHidden: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        // CSS columns: prevent breaks across columns + bottom margin between tiles
        "break-inside-avoid mb-3 group relative overflow-hidden rounded-md border border-ink-200 bg-cream-100",
        "transition-all duration-200",
        asset.isHidden && "opacity-60",
      )}
    >
      {asset.type === "PHOTO" ? (
        // Plain <img> for natural-aspect masonry inside CSS columns.
        // Swap to next/image once aspect dimensions are stored on MediaAsset.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.thumbnailUrl || asset.url}
          alt="Portfolio work"
          loading="lazy"
          className="block w-full h-auto animate-fade-in"
        />
      ) : (
        <video
          src={asset.url}
          className="block w-full h-auto"
          muted
          playsInline
        />
      )}

      {/* Hidden badge */}
      {asset.isHidden && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-pill bg-cream-50 border border-ink-200 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-ink-700">
          Hidden
        </span>
      )}

      {/* Drag handle (top-left, visible on hover, visual only — DnD wiring TODO) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-pill bg-cream-50/95 text-ink-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <GripVertical size={14} strokeWidth={1.5} />
      </span>

      {/* Hover gradient + action row */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-900/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <TileButton
          ariaLabel={asset.isHidden ? "Show on profile" : "Hide from profile"}
          onClick={onToggleHidden}
        >
          {asset.isHidden ? (
            <Eye size={14} strokeWidth={1.75} />
          ) : (
            <EyeOff size={14} strokeWidth={1.75} />
          )}
        </TileButton>
        <TileButton ariaLabel="Delete" onClick={onDelete} destructive>
          <Trash2 size={14} strokeWidth={1.75} />
        </TileButton>
      </div>
    </div>
  );
}

function TileButton({
  ariaLabel,
  onClick,
  children,
  destructive = false,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-pill border bg-cream-50/95 backdrop-blur-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        destructive
          ? "border-ink-200 text-ink-700 hover:bg-error/10 hover:border-error/30 hover:text-error"
          : "border-ink-200 text-ink-700 hover:bg-cream-100 hover:border-ink-300",
      )}
    >
      {children}
    </button>
  );
}

// ─── Dropzone ──────────────────────────────────────────────

function Dropzone({
  onFiles,
  disabled,
  children,
}: {
  onFiles: (files: FileList) => void;
  disabled: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [active, setActive] = React.useState(false);
  const dragCounter = React.useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setActive(true);
    }
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setActive(false);
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) e.dataTransfer.dropEffect = "copy";
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setActive(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop-active overlay */}
      {active && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-rust-500 bg-rust-500/5 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-rust-500">
            <Upload size={28} strokeWidth={1.5} />
            <p className="font-display italic text-base">Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────

function Skeleton(): React.JSX.Element {
  return (
    <div className="columns-2 md:columns-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="break-inside-avoid mb-3 rounded-md skeleton-shimmer bg-cream-100"
          style={{ height: 120 + ((i * 53) % 140) }}
        />
      ))}
    </div>
  );
}
