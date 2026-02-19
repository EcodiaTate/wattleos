// src/app/(app)/portal/layout.tsx
//
// ============================================================
// WattleOS V2 - Parent Portal Layout
// ============================================================
// Authenticated layout for parent-facing pages. Shows school
// branding in header with minimal nav: Dashboard, Applications.
//
// WHY separate from admin layout: Parents see a simpler UI.
// No sidebar with 15 admin modules - just their children's
// info and communication tools.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/portal"
              className="text-lg font-semibold text-gray-900"
            >
              Parent Portal
            </Link>
            <nav className="hidden gap-1 sm:flex">
              <Link
                href="/portal"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/portal/applications"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Applications
              </Link>
            </nav>
          </div>
          <div className="text-sm text-gray-500">
            {ctx.user?.email ?? "Parent"}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
