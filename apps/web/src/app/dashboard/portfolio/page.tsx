"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { MEDIA_LIMITS } from "@nailbook/shared";

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

export default function PortfolioManagementPage() {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/media?providerId=${pid}`);
      const json = await res.json();
      setMedia(json.data || []);
    } catch (e) {
      console.error("Failed to load media:", e);
    }
  }, []);

  useEffect(() => {
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !providerId) return;

    // Validate file size
    if (file.size > MEDIA_LIMITS.MAX_FILE_SIZE_BYTES) {
      alert("File is too large. Max 10MB.");
      return;
    }

    // Determine type
    const isImage = MEDIA_LIMITS.ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof MEDIA_LIMITS.ALLOWED_IMAGE_TYPES)[number]
    );
    const isVideo = MEDIA_LIMITS.ALLOWED_VIDEO_TYPES.includes(
      file.type as (typeof MEDIA_LIMITS.ALLOWED_VIDEO_TYPES)[number]
    );
    if (!isImage && !isVideo) {
      alert("Unsupported file type. Use JPEG, PNG, WebP, MP4, or MOV.");
      return;
    }

    setUploading(true);
    try {
      // 1. Get presigned URL
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          type: isImage ? "PHOTO" : "VIDEO",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || "Upload failed");
        return;
      }

      const { uploadUrl } = json.data;

      // 2. Upload to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // 3. Refresh grid
      await loadMedia(providerId);
    } catch (e) {
      console.error("Upload failed:", e);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleHidden(asset: MediaAsset) {
    try {
      await fetch(`/api/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !asset.isHidden }),
      });
      if (providerId) await loadMedia(providerId);
    } catch (e) {
      console.error("Failed to toggle hidden:", e);
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    try {
      await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
      if (providerId) await loadMedia(providerId);
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  }

  if (loading) {
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-grid-3">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-2xl">Portfolio</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={[
              ...MEDIA_LIMITS.ALLOWED_IMAGE_TYPES,
              ...MEDIA_LIMITS.ALLOWED_VIDEO_TYPES,
            ].join(",")}
            onChange={handleUpload}
            className="hidden"
            id="portfolio-upload"
          />
          <label
            htmlFor="portfolio-upload"
            className={`inline-block cursor-pointer bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </label>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">
            No portfolio items yet. Upload your first photo or video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 rounded-card overflow-hidden">
          {media.map((asset) => (
            <div key={asset.id} className="relative group aspect-square bg-border">
              {asset.type === "PHOTO" ? (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt="Portfolio"
                  className={`w-full h-full object-cover ${
                    asset.isHidden ? "opacity-40" : ""
                  }`}
                />
              ) : (
                <video
                  src={asset.url}
                  className={`w-full h-full object-cover ${
                    asset.isHidden ? "opacity-40" : ""
                  }`}
                  muted
                  playsInline
                />
              )}

              {/* Hidden badge */}
              {asset.isHidden && (
                <span className="absolute top-1 left-1 text-xs font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
                  Hidden
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => toggleHidden(asset)}
                  className="text-xs font-medium bg-surface text-text-primary px-2 py-1 rounded shadow-card hover:bg-surface-alt transition-colors"
                >
                  {asset.isHidden ? "Unhide" : "Hide"}
                </button>
                <button
                  onClick={() => deleteAsset(asset)}
                  className="text-xs font-medium bg-red-600 text-white px-2 py-1 rounded shadow hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
