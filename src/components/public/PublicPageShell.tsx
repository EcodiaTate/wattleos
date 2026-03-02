// src/components/public/PublicPageShell.tsx
//
// ============================================================
// WattleOS V2 - Public Page Shell
// ============================================================
// Server component. Wraps all public family-facing pages with
// a consistent branded header and injects CSS custom properties
// for the school's brand colour (--pb-hue, --pb-sat).
//
// Brand colour cascades to child components via CSS inheritance,
// enabling pb-btn / pb-input / pb-focus utilities to reflect
// the school's configured theme automatically.
// ============================================================

import type { PublicTenantInfo } from "@/lib/auth/public-tenant";
import type { ReactNode } from "react";

interface PublicPageShellProps {
  tenant: PublicTenantInfo;
  children: ReactNode;
  /** Show cross-page nav links in the header (default true) */
  showNav?: boolean;
}

const NAV_PATHS = [
  { path: "/inquiry", label: "Enquire" },
  { path: "/tours", label: "Book a Tour" },
  { path: "/enroll", label: "Enrol" },
];

export function PublicPageShell({
  tenant,
  children,
  showNav = true,
}: PublicPageShellProps) {
  // Always append ?tenant=slug so navigation works in dev (no subdomain).
  // In production the x-tenant-slug header takes priority so the param is
  // harmless, but it ensures links work when shared directly as URLs too.
  const navLinks = NAV_PATHS.map((n) => ({
    href: `${n.path}?tenant=${tenant.slug}`,
    label: n.label,
  }));
  return (
    <div
      className="flex min-h-screen flex-col bg-muted"
      style={
        {
          "--pb-hue": tenant.brand_hue,
          "--pb-sat": `${tenant.brand_sat}%`,
        } as React.CSSProperties
      }
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* School identity */}
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={`${tenant.name} logo`}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-background"
                style={{
                  background: `hsl(var(--pb-hue) var(--pb-sat) 43%)`,
                }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold text-foreground sm:text-base">
              {tenant.name}
            </span>
          </div>

          {/* Nav links */}
          {showNav && (
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card px-6 py-4 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <span className="font-medium text-muted-foreground">WattleOS</span>
      </footer>
    </div>
  );
}
