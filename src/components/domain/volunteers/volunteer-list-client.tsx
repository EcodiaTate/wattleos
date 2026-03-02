"use client";

// src/components/domain/volunteers/volunteer-list-client.tsx

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { VolunteerStatus, VolunteerWithWwccStatus, VolunteerWwccStatus } from "@/types/domain";
import { VolunteerCard } from "./volunteer-card";

interface VolunteerListClientProps {
  initialVolunteers: VolunteerWithWwccStatus[];
}

const STATUS_OPTIONS: Array<{ value: VolunteerStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

const WWCC_OPTIONS: Array<{ value: VolunteerWwccStatus | ""; label: string }> = [
  { value: "", label: "All WWCC" },
  { value: "current", label: "Current" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing" },
];

export function VolunteerListClient({ initialVolunteers }: VolunteerListClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | "">("");
  const [wwccFilter, setWwccFilter] = useState<VolunteerWwccStatus | "">("");

  const filtered = initialVolunteers.filter((v) => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (wwccFilter && v.wwcc_status !== wwccFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${v.first_name} ${v.last_name}`.toLowerCase();
      const email = (v.email ?? "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const selectStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--input)",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "0.875rem",
    cursor: "pointer",
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--input)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            fontSize: "0.9375rem",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VolunteerStatus | "")}
          style={selectStyle}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={wwccFilter}
          onChange={(e) => setWwccFilter(e.target.value as VolunteerWwccStatus | "")}
          style={selectStyle}
        >
          {WWCC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Link
          href="/admin/volunteers/new"
          onClick={() => haptics.medium()}
          className="touch-target active-push"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "0.875rem",
            whiteSpace: "nowrap",
          }}
        >
          + Add volunteer
        </Link>
      </div>

      {/* Count */}
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--muted-foreground)",
          marginBottom: "0.75rem",
        }}
      >
        {filtered.length} volunteer{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "var(--muted-foreground)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", color: "var(--empty-state-icon)" }}>
            🙋
          </div>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No volunteers found</p>
          <p style={{ fontSize: "0.875rem" }}>
            {search || statusFilter || wwccFilter
              ? "Try adjusting your filters."
              : "Add your first volunteer to get started."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {filtered.map((v) => (
            <VolunteerCard key={v.id} volunteer={v} />
          ))}
        </div>
      )}
    </div>
  );
}
