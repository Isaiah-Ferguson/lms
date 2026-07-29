import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-6 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-400">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-slate-100">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
        </p>
        <div className="mt-8">
          <Link href="/home">
            <Button className="w-full">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
