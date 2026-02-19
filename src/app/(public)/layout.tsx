// src/app/(public)/layout.tsx
//
// ============================================================
// WattleOS V2 - Public Pages Layout
// ============================================================
// Minimal layout for pages that don't require authentication:
// enrollment form, invite acceptance, inquiry form.
//
// Shows school branding (name + logo) in a clean header.
// No sidebar, no nav - just the content.
//
// WHY separate layout: Public pages need a different shell
// than the authenticated app. No sidebar, no user context,
// just school branding and clean content area.
// ============================================================

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
