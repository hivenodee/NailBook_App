"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { motion, useReducedMotion } from "framer-motion";

type CoverCropModalProps = {
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
};

// 3:1 cover ratio matches the public profile banner aspect on desktop.
// Output a slightly wider buffer (1920x640) to look sharp on retina displays.
const ASPECT = 3;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 640;

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function CoverCropModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: CoverCropModalProps): React.JSX.Element {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const reduce = useReducedMotion();

  const onCropDone = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function handleSave() {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onCropComplete(blob);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-ink-900/50"
        onClick={onCancel}
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />

      <motion.div
        className="relative rounded-md w-[92vw] max-w-2xl mx-4 overflow-hidden bg-cream-50 border border-ink-200 shadow-soft"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="px-6 py-4 border-b border-ink-100">
          <h3 className="font-display text-xl text-ink-900">Adjust cover</h3>
          <p className="text-xs font-sans text-ink-500 mt-0.5">
            Drag to reposition, scroll to zoom. Cover is cropped to a 3:1 banner.
          </p>
        </div>

        {/* Crop area — taller than the avatar modal so the 3:1 banner is
            visible at a workable size on phones too. */}
        <div className="relative h-[280px] sm:h-[320px] bg-ink-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
          />
        </div>

        <div className="px-6 py-4 flex items-center gap-3">
          <span className="text-xs font-sans text-ink-500">−</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-rust-500"
          />
          <span className="text-xs font-sans text-ink-500">+</span>
        </div>

        <div className="px-6 py-4 flex justify-end gap-2 border-t border-ink-100">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-sans font-medium bg-cream-50 text-ink-900 border border-ink-700 rounded-md transition-all duration-200 hover:border-ink-900 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-sans font-medium bg-rust-500 text-cream-50 border border-rust-500 rounded-md transition-all duration-200 hover:bg-rust-600 hover:border-rust-600 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? "Saving…" : "Save cover"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
