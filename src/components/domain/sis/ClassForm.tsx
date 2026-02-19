// src/components/domain/sis/ClassForm.tsx
//
// ============================================================
// WattleOS V2 - Class Create/Edit Form
// ============================================================
// 'use client' - interactive form for Montessori classrooms.
//
// Why shared: Same fields for create and edit. Accepts optional
// initialData for edit mode, calls createClass or updateClass.
// ============================================================

"use client";

import type { CreateClassInput, UpdateClassInput } from "@/lib/actions/classes";
import { createClass, updateClass } from "@/lib/actions/classes";
import type { Class } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Props ───────────────────────────────────────────────────

interface ClassFormProps {
  /** When provided, form operates in edit mode */
  initialData?: Class;
}

// ── Montessori cycle levels ─────────────────────────────────
// Why hardcoded: Montessori has standardized age groupings.
// Schools rarely deviate from these. Custom values are still
// allowed via the text input fallback.

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

// ── Component ───────────────────────────────────────────────

export function ClassForm({ initialData }: ClassFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // ── Form state ──────────────────────────────────────────
  const [name, setName] = useState(initialData?.name ?? "");
  const [room, setRoom] = useState(initialData?.room ?? "");
  const [cycleLevel, setCycleLevel] = useState(initialData?.cycle_level ?? "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  // ── Submission state ────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (isEditing && initialData) {
      // ── Update existing class ──
      const input: UpdateClassInput = {
        name: name.trim(),
        room: room.trim() || null,
        cycle_level: cycleLevel || null,
        is_active: isActive,
      };

      const result = await updateClass(initialData.id, input);

      if (result.error) {
        setError(result.error.message);
        setIsSaving(false);
        return;
      }

      router.push(`/classes/${initialData.id}`);
      router.refresh();
    } else {
      // ── Create new class ──
      const input: CreateClassInput = {
        name: name.trim(),
        room: room.trim() || null,
        cycle_level: cycleLevel || null,
      };

      const result = await createClass(input);

      if (result.error) {
        setError(result.error.message);
        setIsSaving(false);
        return;
      }

      router.push(`/classes/${result.data!.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Section: Class Details ───────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Class Details
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Class name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="className"
              className="block text-sm font-medium text-gray-700"
            >
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              id="className"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wattle Room, Banksia Environment"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-gray-500">
              The name guides and parents will see (e.g. &quot;Wattle Room&quot;
              or &quot;3–6 Primary A&quot;).
            </p>
          </div>

          {/* Room / location */}
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium text-gray-700"
            >
              Room / Location
            </label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Building A, Room 3"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Cycle level */}
          <div>
            <label
              htmlFor="cycleLevel"
              className="block text-sm font-medium text-gray-700"
            >
              Cycle Level
            </label>
            <select
              id="cycleLevel"
              value={cycleLevel}
              onChange={(e) => setCycleLevel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CYCLE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The Montessori age grouping for this classroom.
            </p>
          </div>

          {/* Active toggle (only in edit mode) */}
          {isEditing && (
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    isActive ? "bg-amber-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">
                  {isActive ? "Active" : "Inactive"}
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Inactive classes are hidden from enrollment options but retain
                their historical records.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={isEditing ? `/classes/${initialData!.id}` : "/classes"}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Class"}
        </button>
      </div>
    </form>
  );
}
