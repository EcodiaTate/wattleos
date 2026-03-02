// src/app/(app)/settings/notifications/page.tsx
//
// Per-user push notification topic preferences.
// Accessible to any logged-in user (parent, staff, admin).

import Link from "next/link";
import { getMyTopicPrefs } from "@/lib/actions/push-notifications";
import { TopicPrefsClient } from "@/components/domain/push-notifications/topic-prefs-client";

export const metadata = { title: "Notification Preferences" };

export default async function NotificationPrefsPage() {
  const result = await getMyTopicPrefs();

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-tab-bar space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
          style={{ color: "var(--foreground)" }}
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Notification Preferences
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Choose which topics send push notifications to your device
          </p>
        </div>
      </div>

      <TopicPrefsClient initialPrefs={result.data ?? []} />
    </div>
  );
}
