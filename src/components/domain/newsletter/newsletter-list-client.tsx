"use client";

import { useCallback, useState, useTransition } from "react";
import type { NewsletterStatus, NewsletterWithDetails } from "@/types/domain";
import { listNewsletters } from "@/lib/actions/comms/newsletter";
import { NewsletterCard } from "./newsletter-card";

interface NewsletterListClientProps {
  initialNewsletters: NewsletterWithDetails[];
  initialTotal: number;
  initialPage: number;
  perPage: number;
}

const STATUS_FILTERS: Array<{ value: NewsletterStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
];

export function NewsletterListClient({
  initialNewsletters,
  initialTotal,
  initialPage,
  perPage,
}: NewsletterListClientProps) {
  const [newsletters, setNewsletters] = useState(initialNewsletters);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus | "">("");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / perPage);

  const fetchPage = useCallback(
    (p: number, status: NewsletterStatus | "") => {
      startTransition(async () => {
        const result = await listNewsletters({
          page: p,
          per_page: perPage,
          status: status || undefined,
        });
        if (!result.error) {
          setNewsletters(result.data);
          setTotal(result.pagination.total);
          setPage(p);
        }
      });
    },
    [perPage],
  );

  const handleStatusChange = (status: NewsletterStatus | "") => {
    setStatusFilter(status);
    fetchPage(1, status);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusChange(f.value)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                statusFilter === f.value ? "var(--primary)" : "var(--muted)",
              color:
                statusFilter === f.value
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isPending ? (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Loading...
          </p>
        </div>
      ) : newsletters.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-3xl" style={{ color: "var(--empty-state-icon)" }}>
            📰
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No newsletters found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <NewsletterCard key={nl.id} newsletter={nl} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchPage(page - 1, statusFilter)}
            disabled={page <= 1 || isPending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{ color: "var(--foreground)" }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1, statusFilter)}
            disabled={page >= totalPages || isPending}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{ color: "var(--foreground)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
