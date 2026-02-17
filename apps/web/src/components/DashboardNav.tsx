"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BadgeCounts = {
  today: number;
  money: number;
  waitlist: number;
  feedback: number;
};

type NavItem = {
  href: string;
  label: string;
  badgeKey?: keyof BadgeCounts;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Today", badgeKey: "today" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/availability", label: "Hours" },
  { href: "/dashboard/money", label: "Money", badgeKey: "money" },
  { href: "/dashboard/portfolio", label: "Portfolio" },
  { href: "/dashboard/waitlist", label: "Waitlist", badgeKey: "waitlist" },
  { href: "/dashboard/feedback", label: "Feedback", badgeKey: "feedback" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/coupons", label: "Coupons" },
  { href: "/dashboard/exports", label: "Exports" },
  { href: "/dashboard/profile", label: "Profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function DashboardNav({ badges }: { badges: BadgeCounts }): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.badgeKey ? badges[item.badgeKey] : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex-shrink-0 whitespace-nowrap text-sm font-medium px-2.5 py-1.5 rounded-nav transition-colors ${
              active
                ? "bg-primary-light text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-background"
            }`}
          >
            {item.label}
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
