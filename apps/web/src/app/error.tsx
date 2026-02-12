"use client";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  return (
    <div style={{ padding: 40 }}>
      <h2>Something went wrong</h2>
      <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
        {error.message}
      </pre>
    </div>
  );
}
