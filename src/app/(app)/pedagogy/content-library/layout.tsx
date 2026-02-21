// src/app/(app)/(app)/pedagogy/content-library/layout.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Content Library Layout
// ============================================================
// WHY a dedicated layout: Module 14 adds sub-pages to the
// curriculum domain. A shared layout with tab navigation keeps
// the user oriented and avoids repeating the header on every page.
//
// WHY permission-gated "Import" tab: Only users with
// manage_curriculum_templates can import JSON templates. The tab
// is hidden for everyone else.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
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
  requiresPermission?: string;
}

const ALL_TABS: NavTab[] = [
  { label: "Templates", href: "", segment: null },
  { label: "Materials", href: "/materials", segment: "materials" },
  {
    label: "Cross-Mappings",
    href: "/cross-mappings",
    segment: "cross-mappings",
  },
  { label: "Compliance", href: "/compliance", segment: "compliance" },
  {
    label: "Import",
    href: "/import",
    segment: "import",
    requiresPermission: "manage_curriculum_templates",
  },
];

export default async function ContentLibraryLayout({
  children,
  params,
}: ContentLibraryLayoutProps) {
  const { tenant } = await params;
  const basePath = `/pedagogy/content-library`;

  // Fetch permissions to gate the Import tab
  const context = await getTenantContext();
  const userPermissions = context.permissions;

  // Filter tabs by permission
  const visibleTabs = ALL_TABS.filter((tab) => {
    if (!tab.requiresPermission) return true;
    return userPermissions.includes(tab.requiresPermission);
  });

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Curriculum Content Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse frameworks, search materials, manage cross-mappings, and
            generate compliance reports.
          </p>
        </div>

        {/* Quick link back to school's curriculum instances */}
        <Link
          href="/pedagogy/curriculum"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                     border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
          Your Curricula
        </Link>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b border-border" role="tablist">
        {visibleTabs.map((tab) => {
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
