import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="font-display text-lg font-medium text-ink">
              Groundwork
            </span>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">
              Built in the open, one working piece at a time. No demo mode,
              no staged screenshots.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
            <div>
              <p className="mb-3 font-medium text-ink">Platform</p>
              <ul className="space-y-2 text-ink-soft">
                <li>
                  <a href="#log" className="hover:text-ink">
                    What&apos;s live
                  </a>
                </li>
                <li>
                  <a href="#how" className="hover:text-ink">
                    How it works
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-ink">
                    Workspace
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-ink">Company</p>
              <ul className="space-y-2 text-ink-soft">
                <li>
                  <a href="#waitlist" className="hover:text-ink">
                    Early access
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@groundwork.dev"
                    className="hover:text-ink"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Groundwork.</span>
          <span>Every claim on this page is either true today or labeled otherwise.</span>
        </div>
      </div>
    </footer>
  );
}
