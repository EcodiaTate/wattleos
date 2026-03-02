// src/app/(public)/inquiry/status/status-checker-client.tsx
//
// ============================================================
// WattleOS V2 - Inquiry Status Checker Client (Module 13)
// ============================================================
// 'use client' - parent enters email + child name to look up
// their inquiry status. Calls checkInquiryStatus() which
// returns only parent-safe fields.
//
// WHY email + child name: Simple identity verification that
// doesn't require an account. The combination is unique per
// tenant (enforced by duplicate checking in submitInquiry).
// Deliberate trade-off: less secure than a token, but much
// more accessible for parents who just want a quick check.
// ============================================================

"use client";

import type { WaitlistStage } from "@/lib/actions/admissions/waitlist-pipeline";
import { checkInquiryStatus } from "@/lib/actions/admissions/waitlist-pipeline";
import { useState } from "react";

interface StatusCheckerClientProps {
  tenantId: string;
  schoolName: string;
}

// ── Stage display for parents (friendly language) ────────────

const PARENT_STAGE_INFO: Record<
  string,
  { label: string; description: string; color: string }
> = {
  inquiry: {
    label: "Inquiry Received",
    description:
      "We've received your inquiry and it's being reviewed by our admissions team.",
    color: "bg-info/10 border-info/30 text-info",
  },
  waitlisted: {
    label: "On Waitlist",
    description:
      "Your child is on our waitlist. We'll be in touch when a place becomes available or to schedule a tour.",
    color: "bg-info/10 border-info/20 text-info",
  },
  tour_scheduled: {
    label: "Tour Scheduled",
    description:
      "You have a tour booked! We look forward to showing you around our school.",
    color: "bg-primary/10 border-primary/30 text-primary",
  },
  tour_completed: {
    label: "Tour Completed",
    description:
      "Thank you for visiting! Our admissions team is reviewing your application and will be in touch soon.",
    color: "bg-success/10 border-success/20 text-success",
  },
  offered: {
    label: "Place Offered",
    description:
      "Congratulations! We've offered your child a place. Please review the details and respond before the deadline.",
    color: "bg-primary/10 border-primary/30 text-primary",
  },
  accepted: {
    label: "Offer Accepted",
    description:
      "Wonderful! Your place is confirmed. You'll receive enrollment paperwork shortly.",
    color: "bg-success/10 border-success/30 text-success",
  },
  enrolled: {
    label: "Enrolled",
    description: "Your child is enrolled! Welcome to our school community.",
    color: "bg-success/15 border-success/30 text-success",
  },
  declined: {
    label: "Offer Declined",
    description:
      "The offer for this application has been declined. Please contact us if you'd like to reapply.",
    color: "bg-destructive/10 border-destructive/30 text-destructive",
  },
  withdrawn: {
    label: "Withdrawn",
    description:
      "This inquiry has been withdrawn. Please contact us if you'd like to re-submit.",
    color: "bg-muted border-border text-foreground",
  },
};

export function StatusCheckerClient({
  tenantId,
  schoolName,
}: StatusCheckerClientProps) {
  const [email, setEmail] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    stage: WaitlistStage;
    child_name: string;
    inquiry_date: string;
    days_waiting: number;
    tour_date: string | null;
    offered_program: string | null;
    offer_expires_at: string | null;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !childFirstName.trim() || !childLastName.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsChecking(true);
    setError(null);
    setNotFound(false);
    setResult(null);

    const response = await checkInquiryStatus(
      tenantId,
      email,
      childFirstName,
      childLastName,
    );

    setIsChecking(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    if (!response.data) {
      setNotFound(true);
      return;
    }

    setResult(response.data);
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Your Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="The email used for your inquiry"
              autoComplete="email"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Child First Name
              </label>
              <input
                type="text"
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Child Last Name
              </label>
              <input
                type="text"
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-primary disabled:opacity-50"
          >
            {isChecking ? "Checking…" : "Check Status"}
          </button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            We couldn't find an inquiry matching those details. Please check the
            spelling matches exactly what you submitted, or{" "}
            <a
              href="/inquiry"
              className="font-medium text-primary hover:underline"
            >
              submit a new inquiry
            </a>
            .
          </p>
        </div>
      )}

      {/* Status result */}
      {result && <StatusResult result={result} schoolName={schoolName} />}
    </div>
  );
}

// ── Status Result Card ───────────────────────────────────────

function StatusResult({
  result,
  schoolName,
}: {
  result: {
    stage: WaitlistStage;
    child_name: string;
    inquiry_date: string;
    days_waiting: number;
    tour_date: string | null;
    offered_program: string | null;
    offer_expires_at: string | null;
  };
  schoolName: string;
}) {
  const stageInfo = PARENT_STAGE_INFO[result.stage] ?? {
    label: result.stage,
    description: "Please contact the school for more information.",
    color: "bg-muted border-border text-foreground",
  };

  const inquiryDate = new Date(result.inquiry_date).toLocaleDateString(
    "en-AU",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-xl border p-6 ${stageInfo.color}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{stageInfo.label}</h3>
            <p className="mt-1 text-sm opacity-90">{stageInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Inquiry Details
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Child</dt>
            <dd className="font-medium text-foreground">{result.child_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Inquiry Submitted</dt>
            <dd className="font-medium text-foreground">{inquiryDate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Days Waiting</dt>
            <dd className="font-medium text-foreground">{result.days_waiting}</dd>
          </div>

          {/* Tour date */}
          {result.tour_date && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tour Date</dt>
              <dd className="font-medium text-foreground">
                {new Date(result.tour_date).toLocaleString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          )}

          {/* Offered program */}
          {result.offered_program && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Offered Program</dt>
              <dd className="font-medium text-foreground">
                {result.offered_program}
              </dd>
            </div>
          )}

          {/* Offer expiry */}
          {result.offer_expires_at && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Offer Expires</dt>
              <dd className="font-medium text-destructive">
                {new Date(result.offer_expires_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Contact CTA */}
      <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Have questions? Contact {schoolName} directly for the latest
          information about your inquiry.
        </p>
      </div>
    </div>
  );
}
