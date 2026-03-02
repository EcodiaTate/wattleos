"use client";

// src/components/domain/push-notifications/topic-prefs-client.tsx
//
// User-facing topic opt-in preferences panel.
// Shown in /notifications for any logged-in user.

import { useState, useTransition } from "react";
import { updateMyTopicPrefs } from "@/lib/actions/push-notifications";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { NotificationTopicPref, NotificationTopic } from "@/types/domain";

const TOPIC_CONFIG: {
  value: NotificationTopic;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: "announcements",
    label: "Announcements",
    emoji: "📢",
    description: "School-wide and class notices from staff",
  },
  {
    value: "messages",
    label: "Messages",
    emoji: "💬",
    description: "Direct and class group messages",
  },
  {
    value: "attendance",
    label: "Attendance",
    emoji: "✅",
    description: "Sign-in alerts, absence notifications",
  },
  {
    value: "events",
    label: "Events",
    emoji: "📅",
    description: "Upcoming events, excursions, RSVPs",
  },
  {
    value: "incidents",
    label: "Incidents",
    emoji: "🚨",
    description: "Child safety and incident reports",
  },
  {
    value: "bookings",
    label: "Bookings",
    emoji: "🎒",
    description: "Booking confirmations and changes",
  },
  {
    value: "reports",
    label: "Reports",
    emoji: "📊",
    description: "Learning reports and updates",
  },
  {
    value: "billing",
    label: "Billing",
    emoji: "🧾",
    description: "Invoices, payments, and fee notices",
  },
  {
    value: "observations",
    label: "Observations",
    emoji: "👁",
    description: "Published learning observations",
  },
  {
    value: "rostering",
    label: "My Schedule",
    emoji: "📅",
    description: "Shift changes, leave updates",
  },
  {
    value: "emergency",
    label: "Emergency alerts",
    emoji: "🆘",
    description: "Critical safety and emergency alerts",
  },
  {
    value: "general",
    label: "General",
    emoji: "🔔",
    description: "General service updates",
  },
];

function buildPrefMap(prefs: NotificationTopicPref[]) {
  const map: Partial<
    Record<NotificationTopic, { push: boolean; email: boolean }>
  > = {};
  for (const p of prefs) {
    map[p.topic] = { push: p.push_enabled, email: p.email_enabled };
  }
  return map;
}

interface Props {
  initialPrefs: NotificationTopicPref[];
}

export function TopicPrefsClient({ initialPrefs }: Props) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefMap, setPrefMap] = useState<
    Partial<Record<NotificationTopic, { push: boolean; email: boolean }>>
  >(() => buildPrefMap(initialPrefs));

  function getPref(topic: NotificationTopic) {
    return prefMap[topic] ?? { push: true, email: false };
  }

  function togglePush(topic: NotificationTopic) {
    haptics.selection();
    setPrefMap((prev) => ({
      ...prev,
      [topic]: { ...getPref(topic), push: !getPref(topic).push },
    }));
    setSaved(false);
  }

  function handleSave() {
    haptics.impact("medium");
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const prefs = TOPIC_CONFIG.map((t) => ({
        topic: t.value,
        push_enabled: getPref(t.value).push,
        email_enabled: getPref(t.value).email,
      }));
      const result = await updateMyTopicPrefs({ prefs });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "var(--push-failed-bg)",
            color: "var(--push-failed-fg)",
            borderColor: "var(--push-failed)",
          }}
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {TOPIC_CONFIG.map((t, i) => {
          const pref = getPref(t.value);
          // Emergency alerts are always on - cannot be disabled
          const isLocked = t.value === "emergency";

          return (
            <div
              key={t.value}
              className={`flex items-center justify-between px-4 py-3.5 ${i !== 0 ? "border-t border-border" : ""}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl shrink-0">{t.emoji}</span>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.label}
                    {isLocked && (
                      <span
                        className="ml-1.5 text-[10px] font-normal"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        always on
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.description}
                  </p>
                </div>
              </div>

              {/* Push toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={isLocked ? true : pref.push}
                disabled={isLocked}
                onClick={() => !isLocked && togglePush(t.value)}
                className="relative shrink-0 ml-3 h-6 w-11 rounded-full transition-colors focus-visible:outline-none disabled:opacity-60"
                style={{
                  background:
                    isLocked || pref.push ? "var(--primary)" : "var(--muted)",
                }}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm"
                  style={{
                    transform:
                      isLocked || pref.push
                        ? "translateX(20px)"
                        : "translateX(0)",
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Emergency alerts cannot be turned off for safety reasons.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="touch-target rounded-lg px-4 py-2.5 text-sm font-semibold active-push disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Saving…" : saved ? "✓ Saved" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
