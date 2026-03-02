"use client";

import { useCallback, useState, useTransition } from "react";
import type { NewsletterTemplate } from "@/types/domain";
import {
  createNewsletterTemplate,
  deleteNewsletterTemplate,
} from "@/lib/actions/comms/newsletter";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface TemplateListClientProps {
  templates: NewsletterTemplate[];
  canManage: boolean;
}

export function TemplateListClient({ templates: initial, canManage }: TemplateListClientProps) {
  const haptics = useHaptics();
  const [templates, setTemplates] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const result = await createNewsletterTemplate({
        name: newName.trim(),
        body_json: [],
        description: newDesc.trim() || null,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data) {
        setTemplates((prev) => [result.data!, ...prev]);
        setNewName("");
        setNewDesc("");
        setShowForm(false);
      }
    });
  }, [haptics, newName, newDesc]);

  const handleDelete = useCallback(
    (id: string) => {
      haptics.impact("medium");
      startTransition(async () => {
        const result = await deleteNewsletterTemplate(id);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      });
    },
    [haptics],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          Newsletter Templates
        </h2>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {showForm ? "Cancel" : "New Template"}
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <div
          className="rounded-lg border border-border p-4 space-y-3"
          style={{ backgroundColor: "var(--card)" }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Creating..." : "Create Template"}
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-3xl" style={{ color: "var(--empty-state-icon)" }}>
            📋
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No templates yet. Create one to speed up newsletter creation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {t.name}
                </p>
                {t.description && (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {t.description}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Updated{" "}
                  {new Date(t.updated_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={isPending}
                  className="text-xs font-medium"
                  style={{ color: "var(--destructive)" }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
