"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FeedFiltersProps {
  students: Array<{ id: string; name: string }>;
  currentStatus?: string;
  currentStudentId?: string;
}

const STATUS_TABS = [
  { value: undefined, label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export function FeedFilters({
  students,
  currentStatus,
  currentStudentId,
}: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset to page 1
    router.push(`/pedagogy/observations?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => updateParams("status", tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Student filter */}
      <select
        value={currentStudentId ?? ""}
        onChange={(e) => updateParams("student", e.target.value || undefined)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All Students</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
