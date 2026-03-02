"use client";

import { useState, useMemo } from "react";
import { PersonPhotoCard } from "./person-photo-card";

interface PhotoGridPerson {
  id: string;
  name: string;
  subtitle: string | null;
  photoUrl: string | null;
  hasPhoto: boolean;
}

interface PhotoGridProps {
  people: PhotoGridPerson[];
  onPersonClick?: (id: string) => void;
  emptyMessage?: string;
}

export function PhotoGrid({
  people,
  onPersonClick,
  emptyMessage = "No people found",
}: PhotoGridProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return people;
    const term = search.toLowerCase().trim();
    return people.filter((p) => p.name.toLowerCase().includes(term));
  }, [people, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="active-push touch-target absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] px-2 py-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((person) => (
            <PersonPhotoCard
              key={person.id}
              id={person.id}
              name={person.name}
              subtitle={person.subtitle}
              photoUrl={person.photoUrl}
              hasPhoto={person.hasPhoto}
              onClick={
                onPersonClick ? () => onPersonClick(person.id) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--empty-state-icon)" }}
            className="mb-3"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {search.trim()
              ? `No results for "${search.trim()}"`
              : emptyMessage}
          </p>
        </div>
      )}
    </div>
  );
}
