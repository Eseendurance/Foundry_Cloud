import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <span className="font-mono text-sm text-ink-soft">404</span>
      <h1 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        Nothing built here yet
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        This page doesn&apos;t exist — or it&apos;s one of the modules that
        isn&apos;t live yet. Check the build log to see what is.
      </p>
      <Link
        href="/"
        className="mt-6 flex items-center gap-2 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-paper hover:bg-moss-deep"
      >
        <ArrowLeft size={15} />
        Back home
      </Link>
    </div>
  );
}
