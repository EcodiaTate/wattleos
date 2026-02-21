// src/app/legal/layout.tsx
//
// Shared layout for all legal pages (privacy, terms, data-processing).
// WHY a dedicated layout: Provides consistent navigation between legal
// pages and a clean reading experience, while reusing the marketing footer.

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  MarketingFooter,
  MarketingShell,
  WattleLogo,
} from "@/app/wattleos/components";

export const metadata: Metadata = {
  title: {
    template: "%s · WattleOS Legal",
    default: "Legal · WattleOS",
  },
  description:
    "WattleOS legal documents — privacy policy, terms of service, and data processing agreement.",
};

// ────────────────────────────────────────────────────────────
// Legal navigation links
// ────────────────────────────────────────────────────────────
const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/data-processing", label: "Data Processing" },
] as const;

// ────────────────────────────────────────────────────────────
// Layout
// ────────────────────────────────────────────────────────────
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(44, 24, 16, 0.06)",
          background: "rgba(254, 252, 246, 0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <WattleLogo size={28} />
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 20,
                color: "#2C1810",
                fontWeight: 500,
              }}
            >
              WattleOS
            </span>
          </Link>

          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#5C4A32",
                  textDecoration: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "rgba(44, 24, 16, 0.04)",
                  transition: "background 0.2s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main
        style={{
          flex: 1,
          maxWidth: 800,
          margin: "0 auto",
          padding: "48px 24px 80px",
          width: "100%",
        }}
      >
        {children}
      </main>

      {/* ── Shared marketing footer ── */}
      <MarketingFooter />
    </MarketingShell>
  );
}