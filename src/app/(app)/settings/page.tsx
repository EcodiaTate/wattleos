// src/app/(app)/settings/page.tsx
//
// ============================================================
// WattleOS V2 — User Settings Landing Page
// ============================================================
// Any authenticated user can access this. Shows cards linking
// to personal setting sub-sections.
//
// WHY separate from /admin:
//   /admin is permission-gated for school administrators.
//   /settings is for every user's personal preferences.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";

export const metadata = {
  title: "My Settings",
};

export default async function UserSettingsPage() {
  const context = await getTenantContext();

  const cards = [
    {
      label: "Display",
      description: "Theme, layout density, and text size.",
      href: "/settings/display",
      icon: (
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
          />
        </svg>
      ),
    },
    // Future settings sections can be added here:
    // { label: 'Notifications', description: '...', href: '/settings/notifications', icon: ... },
    // { label: 'Calendar Sync', description: '...', href: '/settings/calendar', icon: ... },
  ];

  return (
    <div className="space-y-[var(--density-section-gap)]">
      <div>
        <h1 className="text-[var(--text-2xl)] font-semibold text-foreground">
          My Settings
        </h1>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Personalise your WattleOS experience.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--density-sm)] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-[var(--density-card-padding)] transition-all card-interactive"
          >
            {card.icon}
            <div>
              <h3 className="text-[var(--text-sm)] font-semibold text-foreground group-hover:text-primary">
                {card.label}
              </h3>
              <p className="mt-0.5 text-[var(--text-xs)] text-muted-foreground">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
