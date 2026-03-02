"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { RosterTemplate } from "@/types/domain";
import { deleteRosterTemplate } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function TemplateListClient({
  templates,
  canManage,
}: {
  templates: RosterTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      haptics.impact("medium");
      await deleteRosterTemplate(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Link
          href="/admin/rostering/templates/new"
          className="active-push touch-target inline-block rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          + New Template
        </Link>
      )}

      {templates.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No roster templates yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="card-interactive flex items-center justify-between rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div>
                <Link
                  href={`/admin/rostering/templates/${t.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                  style={{ color: "var(--foreground)" }}
                >
                  {t.name}
                </Link>
                {t.description && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {t.description}
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={isPending}
                  className="text-xs underline-offset-2 hover:underline"
                  style={{ color: "var(--destructive)" }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
