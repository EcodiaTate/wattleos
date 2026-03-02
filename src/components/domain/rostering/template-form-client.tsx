"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRosterTemplate } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function TemplateFormClient() {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRosterTemplate({ name, description: description || undefined });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push(`/admin/rostering/templates/${result.data!.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Template Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Term 1 Standard Week"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        {isPending ? "Creating…" : "Create Template"}
      </button>
    </form>
  );
}
