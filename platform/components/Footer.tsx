import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="font-display text-lg font-medium text-ink">
              Foundry Cloud
            </span>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">
              A practical workspace for building software with clear service
              requirements and no hidden provider branding.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
            <div>
              <p className="mb-3 font-medium text-ink">Platform</p>
              <ul className="space-y-2 text-ink-soft">
                <li>
                  <Link href="/#tools" className="hover:text-ink">
                    Explore tools
                  </Link>
                </li>
                <li>
                  <Link href="/templates" className="hover:text-ink">
                    Templates
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-ink">
                    Workspace
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-ink">Project</p>
              <ul className="space-y-2 text-ink-soft">
                <li>
                  <Link href="/status" className="hover:text-ink">
                    Service status
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/Eseendurance/Foundry_Cloud"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink"
                  >
                    Source repository
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Foundry Cloud.</span>
          <span>Service availability depends on your deployment and configuration.</span>
        </div>
      </div>
    </footer>
  );
}
