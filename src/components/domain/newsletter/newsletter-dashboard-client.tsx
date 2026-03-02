"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { NewsletterDashboardData } from "@/types/domain";
import { createNewsletter } from "@/lib/actions/comms/newsletter";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { NewsletterCard } from "./newsletter-card";
import { OpenRateBar } from "./open-rate-bar";

interface NewsletterDashboardClientProps {
  data: NewsletterDashboardData;
  canManage: boolean;
  canSend: boolean;
}

export function NewsletterDashboardClient({
  data,
  canManage,
}: NewsletterDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreateDraft = useCallback(() => {
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const result = await createNewsletter({
        title: "Untitled Newsletter",
        subject_line: "Newsletter",
        audience: "all_parents",
        body_html: "",
        body_json: [],
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (result.data) {
        router.push(`/comms/newsletters/${result.data.id}/edit`);
      }
    });
  }, [haptics, router]);

  const { stats, recent_newsletters, templates } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Newsletter
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Rich-text newsletters with read-receipt tracking
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleCreateDraft}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Creating..." : "New Newsletter"}
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
            backgroundColor: "var(--destructive-bg, transparent)",
          }}
        >
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sent" value={stats.total_sent} token="--newsletter-sent" />
        <StatCard label="Drafts" value={stats.total_drafts} token="--newsletter-draft" />
        <StatCard label="Scheduled" value={stats.total_scheduled} token="--newsletter-scheduled" />
        <div
          className="rounded-lg border border-border p-3"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Avg Open Rate
          </p>
          <p className="mt-1 text-lg font-bold" style={{ color: "var(--foreground)" }}>
            {Math.round(stats.avg_open_rate * 100)}%
          </p>
        </div>
      </div>

      {/* Templates quick access */}
      {templates.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Templates
            </h2>
            <Link
              href="/comms/newsletters/templates"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex-shrink-0 rounded-lg border border-border px-3 py-2"
                style={{ backgroundColor: "var(--card)" }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  {t.name}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {t.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent newsletters */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Recent Newsletters
          </h2>
          <Link
            href="/comms/newsletters/all"
            className="text-xs font-medium"
            style={{ color: "var(--primary)" }}
          >
            View all
          </Link>
        </div>
        {recent_newsletters.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center">
            <p
              className="text-3xl"
              style={{ color: "var(--empty-state-icon)" }}
            >
              📰
            </p>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No newsletters yet. Create your first one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent_newsletters.map((nl) => (
              <NewsletterCard key={nl.id} newsletter={nl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  token,
}: {
  label: string;
  value: number;
  token: string;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-lg font-bold"
        style={{ color: `var(${token})` }}
      >
        {value}
      </p>
    </div>
  );
}
