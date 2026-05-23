import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-50">
      <div className="max-w-md w-full text-center space-y-6">
        <Heading variant="display" className="text-ink-200 text-[120px] leading-none">
          404
        </Heading>
        <Heading variant="h2" className="-mt-4">Page not found</Heading>
        <p className="text-base font-sans text-ink-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="primary" size="md">Back to home</Button>
        </Link>
      </div>
    </main>
  );
}
