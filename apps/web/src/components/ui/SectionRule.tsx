import * as React from "react";

/**
 * Editorial section header: letterspaced eyebrow label with a hairline rule
 * running to the edge. Replaces the old `Heading + short rust dash` pattern.
 *
 * No hooks, so it works in both server and client components.
 */
export function SectionRule({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <h2 className="text-label text-ink-700 whitespace-nowrap">{label}</h2>
      <span aria-hidden="true" className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
