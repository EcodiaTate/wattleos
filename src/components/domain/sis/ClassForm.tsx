// src/components/domain/sis/ClassForm.tsx
"use client";

import type { CreateClassInput, UpdateClassInput } from "@/lib/actions/classes";
import { createClass, updateClass } from "@/lib/actions/classes";
import type { Class } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ClassFormProps {
  initialData?: Class;
}

const CYCLE_LEVEL_OPTIONS = [
  { value: "", label: "Select cycle level..." },
  { value: "0-3", label: "Infant/Toddler (0–3)" },
  { value: "3-6", label: "Primary / Casa (3–6)" },
  { value: "6-9", label: "Lower Elementary (6–9)" },
  { value: "6-12", label: "Elementary (6–12)" },
  { value: "9-12", label: "Upper Elementary (9–12)" },
  { value: "12-15", label: "Adolescent (12–15)" },
  { value: "15-18", label: "Upper Adolescent (15–18)" },
] as const;

const INPUT_CLASS = "mt-1 block w-full rounded-lg border border-input bg-card px-4 h-[var(--density-input-height)] text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all";

export function ClassForm({ initialData }: ClassFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [room, setRoom] = useState(initialData?.room ?? "");
  const [cycleLevel, setCycleLevel] = useState(initialData?.cycle_level ?? "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const input = {
      name: name.trim(),
      room: room.trim() || null,
      cycle_level: cycleLevel || null,
      ...(isEditing && { is_active: isActive }),
    };

    const result = isEditing 
      ? await updateClass(initialData!.id, input as UpdateClassInput)
      : await createClass(input as CreateClassInput);

    if (result.error) {
      setError(result.error.message);
      setIsSaving(false);
      return;
    }

    router.push(`/classes/${isEditing ? initialData!.id : result.data!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--density-section-gap)]">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-[var(--density-card-padding)] animate-fade-in-down">
          <p className="text-sm font-bold text-destructive">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Class Details
        </h2>

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="className" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Class Name <span className="text-destructive">*</span>
            </label>
            <input
              id="className"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wattle Room, Banksia Environment"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg">
              The name guides and parents will see.
            </p>
          </div>

          <div>
            <label htmlFor="room" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Room / Location
            </label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Building A, Room 3"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="cycleLevel" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Cycle Level
            </label>
            <select
              id="cycleLevel"
              value={cycleLevel}
              onChange={(e) => setCycleLevel(e.target.value)}
              className={INPUT_CLASS}
            >
              {CYCLE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div className="sm:col-span-2 pt-2 border-t border-border">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-spring outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-300 ease-spring ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <label className="text-sm font-bold text-foreground">
                  {isActive ? "Active Class" : "Inactive / Archived"}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href={isEditing ? `/classes/${initialData!.id}` : "/classes"}
          className="rounded-lg border border-border bg-background px-6 h-[var(--density-button-height)] text-sm font-bold text-foreground shadow-sm hover:bg-muted transition-all active:scale-95 flex items-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded-lg bg-primary px-8 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Class"}
        </button>
      </div>
    </form>
  );
}