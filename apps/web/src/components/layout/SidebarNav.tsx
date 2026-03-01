"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Users,
  Scissors,
  CalendarClock,
  Image as ImageIcon,
  DollarSign,
  MessageSquare,
  ListOrdered,
  Tag,
  Mail,
  ArrowLeftRight,
  Bell,
  BellRing,
  User,
  MoreHorizontal,
  X,
} from "lucide-react";

type BadgeCounts = {
  today: number;
  appointments: number;
  money: number;
  waitlist: number;
  feedback: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: keyof BadgeCounts;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Today", icon: CalendarCheck, badgeKey: "today" },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/history", label: "Appointments", icon: Clock, badgeKey: "appointments" },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/dashboard/services", label: "Services", icon: Scissors },
      { href: "/dashboard/availability", label: "Hours", icon: CalendarClock },
      { href: "/dashboard/portfolio", label: "Portfolio", icon: ImageIcon },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/dashboard/money", label: "Money", icon: DollarSign, badgeKey: "money" },
      { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare, badgeKey: "feedback" },
      { href: "/dashboard/waitlist", label: "Waitlist", icon: ListOrdered, badgeKey: "waitlist" },
      { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/messages", label: "Messages", icon: Mail },
      { href: "/dashboard/exports", label: "Import / Export", icon: ArrowLeftRight },
      { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
      { href: "/dashboard/notifications", label: "Notifications", icon: BellRing },
      { href: "/dashboard/profile", label: "Profile", icon: User },
    ],
  },
];

// Mobile bottom tabs: 5 key items
const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: CalendarCheck, badgeKey: "today" },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/money", label: "Money", icon: DollarSign, badgeKey: "money" },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: ImageIcon },
];

// Items that go in the "More" sheet (everything not in MOBILE_TABS)
const MOBILE_TAB_HREFS = new Set(MOBILE_TABS.map((t) => t.href));
const MORE_SECTIONS = NAV_SECTIONS.map((section) => ({
  ...section,
  items: section.items.filter((item) => !MOBILE_TAB_HREFS.has(item.href)),
})).filter((section) => section.items.length > 0);

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// Find the badgeKey for a given pathname
function badgeKeyForPath(pathname: string): keyof BadgeCounts | null {
  const allItems = NAV_SECTIONS.flatMap((s) => s.items).concat(MOBILE_TABS);
  for (const item of allItems) {
    if (item.badgeKey && isActive(pathname, item.href)) {
      return item.badgeKey;
    }
  }
  return null;
}

export default function SidebarNav({
  badges,
}: {
  badges: BadgeCounts;
}): React.JSX.Element {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [seenBadges, setSeenBadges] = useState<Set<string>>(new Set());

  // When navigating to a badged page, mark it as seen (persists until full page reload)
  useEffect(() => {
    setMoreOpen(false);
    const key = badgeKeyForPath(pathname);
    if (key && badges[key] > 0) {
      setSeenBadges((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }
  }, [pathname, badges]);

  // Close on escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMoreOpen(false);
  }, []);

  useEffect(() => {
    if (moreOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [moreOpen, handleKeyDown]);

  // Check if any "More" item is active
  const moreActive = MORE_SECTIONS.some((section) =>
    section.items.some((item) => isActive(pathname, item.href))
  );

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 w-60 h-full bg-surface-alt border-r border-border z-20 overflow-y-auto">
        <div className="px-grid-3 py-grid-3">
          <Link href="/dashboard" className="font-display text-xl text-text-primary">
            NailBook
          </Link>
        </div>

        <nav className="flex-1 px-2 pb-grid-3 space-y-grid-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-grid-2 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  const showBadge = badgeCount > 0 && !active && !(item.badgeKey && seenBadges.has(item.badgeKey));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-grid-2 px-grid-2 py-2.5 min-h-[44px] text-sm rounded-lg transition-colors ${
                        active
                          ? "border-l-2 border-l-primary text-primary bg-primary-light/20"
                          : "border-l-2 border-l-transparent text-text-muted hover:text-text-secondary hover:bg-primary-light/20"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-medium px-1">
                          {badgeCount > 9 ? "9+" : `+${badgeCount}`}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <div className="flex lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-20 safe-bottom">
        <div className="flex w-full">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item.href);
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
            const showBadge = badgeCount > 0 && !active && !(item.badgeKey && seenBadges.has(item.badgeKey));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] transition-colors ${
                  active ? "text-primary" : "text-text-muted"
                }`}
              >
                <span className="relative">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-medium px-0.5">
                      {badgeCount > 9 ? "9+" : `+${badgeCount}`}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] transition-colors ${
              moreActive ? "text-primary" : "text-text-muted"
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* ─── More Sheet (mobile) ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[16px] safe-bottom animate-fade-in-up">
            <div className="flex items-center justify-between px-grid-3 py-grid-2 border-b border-border">
              <p className="font-display text-lg">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="px-grid-2 py-grid-2 space-y-grid-2 max-h-[60vh] overflow-y-auto">
              {MORE_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-grid-2 mb-1">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(pathname, item.href);
                      const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                      const showBadge = badgeCount > 0 && !active && !(item.badgeKey && seenBadges.has(item.badgeKey));
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-grid-2 px-grid-2 py-3 min-h-[44px] text-sm rounded-lg transition-colors ${
                            active
                              ? "text-primary bg-primary-light/20"
                              : "text-text-muted hover:text-text-secondary hover:bg-primary-light/20"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-medium px-1">
                              {badgeCount > 9 ? "9+" : `+${badgeCount}`}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
