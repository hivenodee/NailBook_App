import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-grid-2">
      <div className="max-w-md w-full text-center space-y-grid-3">
        <h1 className="font-display text-5xl text-text-primary">404</h1>
        <h2 className="font-display text-2xl text-text-primary">
          Page Not Found
        </h2>
        <p className="text-text-secondary text-base">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white py-3 px-6 rounded-button font-medium hover:bg-primary-hover transition-colors tracking-wide"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
