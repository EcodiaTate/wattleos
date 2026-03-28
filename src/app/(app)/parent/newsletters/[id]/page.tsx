// src/app/(app)/parent/newsletters/[id]/page.tsx
//
// Parent single-newsletter view. Records read receipt on load.

import Link from "next/link";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";
import { getNewsletter, recordReadReceipt } from "@/lib/actions/comms/newsletter";
import { notFound } from "next/navigation";

export const metadata = { title: "Newsletter - WattleOS" };

interface ParentNewsletterDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ParentNewsletterDetailPage({
  params,
}: ParentNewsletterDetailProps) {
  const { id } = await params;

  const result = await getNewsletter(id);

  if (result.error || !result.data) {
    notFound();
  }

  const nl = result.data;

  // Record read receipt server-side on page load
  await recordReadReceipt(nl.id);

  return (
    <div className="space-y-6">
      <Link
        href="/parent/newsletters"
        className="text-sm"
        style={{ color: "var(--primary)" }}
      >
        &larr; All Newsletters
      </Link>

      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {nl.title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {nl.sent_at
            ? new Date(nl.sent_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""}
        </p>
        {nl.author && (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            From {nl.author.first_name} {nl.author.last_name}
          </p>
        )}
      </div>

      <div
        className="rounded-lg border border-border p-6"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div
          className="prose max-w-none text-sm"
          style={{ color: "var(--foreground)" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(nl.body_html) }}
        />
      </div>
    </div>
  );
}
