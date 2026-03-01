import Link from "next/link";

export default function HomePage(): React.JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-grid-2">
      <div className="max-w-md w-full text-center space-y-grid-3">
        <h1 className="font-display text-3xl text-text-primary">NailBook</h1>
        <p className="text-text-secondary text-lg">
          Book your next nail appointment in seconds.
        </p>
        <p className="text-text-muted text-sm">
          Got a link from your nail tech? Paste it in your browser to book
          directly.
        </p>
        <Link
          href="/explore"
          className="inline-block bg-primary text-white py-3 px-6 rounded-button font-medium hover:bg-primary-hover transition-colors tracking-wide"
        >
          Explore Nearby Providers
        </Link>
      </div>
    </main>
  );
}
