import CalendarClient from "@/components/calendar/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage(): Promise<React.JSX.Element> {
  return (
    <div className="space-y-3">
      <p className="text-label text-ink-500">Schedule &middot; Your days, mapped</p>
      <CalendarClient />
    </div>
  );
}
