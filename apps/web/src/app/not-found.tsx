import Link from "next/link";

// Force dynamic rendering to prevent prerendering issues with Stack Auth
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 text-blue-600 hover:underline">
        Go back home
      </Link>
    </div>
  );
}
