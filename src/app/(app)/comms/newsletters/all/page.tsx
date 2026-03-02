// src/app/(app)/comms/newsletters/all/page.tsx
//
// Full paginated list of all newsletters with status filters.

import Link from "next/link";
import { NewsletterListClient } from "@/components/domain/newsletter/newsletter-list-client";
import { listNewsletters } from "@/lib/actions/comms/newsletter";

export const metadata = { title: "All Newsletters - WattleOS" };

export default async function AllNewslettersPage() {
  const result = await listNewsletters({ page: 1, per_page: 20 });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/comms/newsletters"
          className="text-sm"
          style={{ color: "var(--primary)" }}
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          All Newsletters
        </h1>
      </div>

      <NewsletterListClient
        initialNewsletters={result.data}
        initialTotal={result.pagination.total}
        initialPage={1}
        perPage={20}
      />
    </div>
  );
}
