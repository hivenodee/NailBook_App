"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/cn";

export type PortfolioAsset = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
};

const containerVariants: Variants = {
  hidden: {},
  // 50ms stagger per SKILL — discovery feed cadence
  visible: { transition: { staggerChildren: 0.05 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export function PortfolioGrid({
  assets,
}: {
  assets: PortfolioAsset[];
}): React.JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="grid grid-cols-3 gap-2 auto-rows-[110px] sm:auto-rows-[140px] md:auto-rows-[160px]"
      initial={reduce ? false : "hidden"}
      animate={reduce ? undefined : "visible"}
      variants={containerVariants}
    >
      {assets.map((asset, i) => {
        // First tile reads as the "hero" of the grid when there's
        // enough material around it to balance the layout.
        const isFeature = i === 0 && assets.length >= 4;
        return (
          <motion.div
            key={asset.id}
            variants={tileVariants}
            className={cn(
              "relative overflow-hidden rounded-md bg-cream-100 group",
              isFeature && "row-span-2",
            )}
          >
            {asset.type === "PHOTO" ? (
              <Image
                src={asset.thumbnailUrl ?? asset.url}
                alt="Portfolio work"
                fill
                sizes={isFeature ? "33vw" : "(min-width: 768px) 220px, 33vw"}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <video
                src={asset.url}
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
