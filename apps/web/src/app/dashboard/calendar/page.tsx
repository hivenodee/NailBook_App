import CalendarClient from "@/components/calendar/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage(): Promise<React.JSX.Element> {
  return <CalendarClient />;
}
