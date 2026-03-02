// src/app/(app)/comms/newsletters/[id]/page.tsx
//
// Newsletter detail view - shows the newsletter content,
// status, and read-receipt analytics for sent editions.

import Link from "next/link";
import { NewsletterStatusPill } from "@/components/domain/newsletter/newsletter-status-pill";
import { NewsletterRecipientList } from "@/components/domain/newsletter/newsletter-recipient-list";
import { OpenRateBar } from "@/components/domain/newsletter/open-rate-bar";
import {
  getNewsletter,
  listNewsletterRecipients,
} from "@/lib/actions/comms/newsletter";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Newsletter Detail - WattleOS" };

interface NewsletterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsletterDetailPage({
  params,
}: NewsletterDetailPageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canManage = hasPermission(ctx, Permissions.MANAGE_NEWSLETTER);

  const result = await getNewsletter(id);

  if (result.error || !result.data) {
    notFound();
  }

  const nl = result.data;

  // Load initial recipients for sent newsletters
  let initialRecipients: Awaited<
    ReturnType<typeof listNewsletterRecipients>
  >["data"] = [];
  if (nl.status === "sent") {
    const recipientResult = await listNewsletterRecipients({
      newsletter_id: nl.id,
      per_page: 50,
    });
    initialRecipients = recipientResult.data;
  }

  const dateStr = nl.sent_at
    ? `Sent ${new Date(nl.sent_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : nl.scheduled_for
      ? `Scheduled for ${new Date(nl.scheduled_for).toLocaleDateString(
          "en-AU",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`
      : "Draft";

  return (
    <div className="space-y-6">
      {/* Breadcrumb + edit link */}
      <div className="flex items-center justify-between">
        <Link
          href="/comms/newsletters"
          className="text-sm"
          style={{ color: "var(--primary)" }}
        >
          &larr; Newsletter Dashboard
        </Link>
        {canManage && (nl.status === "draft" || nl.status === "scheduled") && (
          <Link
            href={`/comms/newsletters/${nl.id}/edit`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Edit
          </Link>
        )}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {nl.title}
          </h1>
          <NewsletterStatusPill status={nl.status} size="md" />
        </div>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {dateStr}
        </p>
        {nl.author && (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            By {nl.author.first_name} {nl.author.last_name}
          </p>
        )}
      </div>

      {/* Open rate for sent newsletters */}
      {nl.status === "sent" && (
        <OpenRateBar
          recipientCount={nl.recipient_count}
          readCount={nl.read_count}
        />
      )}

      {/* Body */}
      <div
        className="rounded-lg border border-border p-6"
        style={{ backgroundColor: "var(--card)" }}
      >
        <p
          className="mb-2 text-xs font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Subject: {nl.subject_line}
          {nl.preheader && ` - ${nl.preheader}`}
        </p>
        <div
          className="prose max-w-none text-sm"
          style={{ color: "var(--foreground)" }}
          dangerouslySetInnerHTML={{ __html: nl.body_html }}
        />
      </div>

      {/* Recipient analytics for sent editions */}
      {nl.status === "sent" && (
        <NewsletterRecipientList
          newsletterId={nl.id}
          recipientCount={nl.recipient_count}
          readCount={nl.read_count}
          initialRecipients={initialRecipients}
        />
      )}
    </div>
  );
}
