"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
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
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 w-[220px] h-full z-20 overflow-y-auto bg-cream-50 border-r border-ink-200">
        {/* Logo */}
        <div className="px-5 py-6 mb-1 border-b border-ink-200">
          <Link href="/dashboard">
            <Logo size="md" />
          </Link>
        </div>

        <nav className="flex-1 py-1 space-y-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-5 pt-5 pb-1.5 font-sans text-[10px] uppercase tracking-wide text-ink-500">
                {section.label}
              </p>
              <div className="space-y-px">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  const showBadge = badgeCount > 0 && !active && !(item.badgeKey && seenBadges.has(item.badgeKey));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        active
                          ? "flex items-center gap-3 mx-2 px-5 py-2 text-sm font-sans font-medium text-ink-900 bg-cream-100 border-l-2 border-rust-500 rounded-r-md transition-colors duration-150"
                          : "flex items-center gap-3 mx-2 px-5 py-2 text-sm font-sans text-ink-500 rounded-md transition-colors duration-150 hover:bg-cream-100 hover:text-ink-900"
                      }
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className={active ? "text-rust-500" : "text-ink-500"}
                      />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="w-[5px] h-[5px] rounded-full bg-rust-500 mr-2" />
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
      <div className="flex lg:hidden fixed bottom-0 left-0 right-0 z-20 safe-bottom bg-cream-50/90 backdrop-blur-xl border-t border-ink-200">
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
                className={
                  "flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] transition-colors " +
                  (active ? "text-rust-500" : "text-ink-500")
                }
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={1.5} />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-pill bg-rust-500 animate-scale-pop" />
                  )}
                </span>
                <span className={`text-[10px] font-sans ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                {active && <span className="w-4 h-0.5 rounded-pill bg-rust-500 mt-0.5" />}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={
              "flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] transition-colors " +
              (moreActive ? "text-rust-500" : "text-ink-500")
            }
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
            <span className={`text-[10px] font-sans ${moreActive ? "font-semibold" : "font-medium"}`}>More</span>
            {moreActive && <span className="w-4 h-0.5 rounded-pill bg-rust-500 mt-0.5" />}
          </button>
        </div>
      </div>

      {/* ─── More Sheet (mobile) ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[16px] safe-bottom animate-slide-up bg-cream-50 border-t border-ink-200 shadow-soft">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <p className="font-display text-lg text-ink-900">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="h-11 w-11 inline-flex items-center justify-center rounded-pill text-ink-700 hover:bg-cream-100 transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {MORE_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="font-sans uppercase px-4 mb-1 text-[10px] tracking-widest font-medium text-ink-500">
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
                          className={
                            "flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-sans rounded-md transition-colors " +
                            (active
                              ? "text-rust-500 bg-cream-100"
                              : "text-ink-700 hover:bg-cream-100")
                          }
                        >
                          <Icon size={18} strokeWidth={1.5} />
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <span className="w-[6px] h-[6px] rounded-pill bg-rust-500 animate-scale-pop" />
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
