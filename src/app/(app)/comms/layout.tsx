// src/app/(app)/comms/layout.tsx
//
// WHY a dedicated layout: The comms module has three distinct
// sub-sections (Announcements, Messages, Events) that need
// persistent tab navigation. This layout provides that.

import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";

interface CommsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function CommsLayout({
  children,
  params,
}: CommsLayoutProps) {
  const { tenant: tenantSlug } = await params;
  await getTenantContext();

  const tabs = [
    {
      label: "Announcements",
      href: `/comms/announcements`,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
          />
        </svg>
      ),
    },
    {
      label: "Messages",
      href: `/comms/messages`,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      ),
    },
    {
      label: "Events",
      href: `/comms/events`,
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Announcements, messaging, and events for your school community.
        </p>
      </div>

      {/* ── Tab Navigation ───────────────────────────────── */}
      <nav className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 hover:shadow-sm [&.active]:bg-white [&.active]:text-amber-700 [&.active]:shadow-sm"
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* ── Content ──────────────────────────────────────── */}
      {children}
    </div>
  );
}
