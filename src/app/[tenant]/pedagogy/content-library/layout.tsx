// src/app/(app)/[tenant]/pedagogy/content-library/layout.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Content Library Layout
// ============================================================
// WHY a dedicated layout: Module 14 adds 5 sub-pages to the
// curriculum domain. A shared layout with tab navigation keeps
// the user oriented and avoids repeating the header on every page.
// ============================================================

import { headers } from "next/headers";
import Link from "next/link";

interface ContentLibraryLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

interface NavTab {
  label: string;
  href: string;
  segment: string | null; // null = index page
}

const TABS: NavTab[] = [
  { label: "Templates", href: "", segment: null },
  { label: "Materials", href: "/materials", segment: "materials" },
  {
    label: "Cross-Mappings",
    href: "/cross-mappings",
    segment: "cross-mappings",
  },
  { label: "Compliance", href: "/compliance", segment: "compliance" },
];

export default async function ContentLibraryLayout({
  children,
  params,
}: ContentLibraryLayoutProps) {
  const { tenant } = await params;
  const basePath = `/${tenant}/pedagogy/content-library`;

  // Determine active tab from the current URL
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const afterBase = pathname.replace(basePath, "");

  function isActive(tab: NavTab): boolean {
    if (tab.segment === null) {
      return afterBase === "" || afterBase === "/";
    }
    return afterBase.startsWith(`/${tab.segment}`);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Curriculum Content Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse frameworks, search materials, manage cross-mappings, and
          generate compliance reports.
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.label}
              href={`${basePath}${tab.href}`}
              role="tab"
              aria-selected={active}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative
                ${
                  active
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
