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
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  waitlisted: {
    label: "On Waitlist",
    description:
      "Your child is on our waitlist. We'll be in touch when a place becomes available or to schedule a tour.",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
  tour_scheduled: {
    label: "Tour Scheduled",
    description:
      "You have a tour booked! We look forward to showing you around our school.",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  tour_completed: {
    label: "Tour Completed",
    description:
      "Thank you for visiting! Our admissions team is reviewing your application and will be in touch soon.",
    color: "bg-teal-50 border-teal-200 text-teal-800",
  },
  offered: {
    label: "Place Offered",
    description:
      "Congratulations! We've offered your child a place. Please review the details and respond before the deadline.",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
  accepted: {
    label: "Offer Accepted",
    description:
      "Wonderful! Your place is confirmed. You'll receive enrollment paperwork shortly.",
    color: "bg-green-50 border-green-200 text-green-800",
  },
  enrolled: {
    label: "Enrolled",
    description: "Your child is enrolled! Welcome to our school community.",
    color: "bg-green-100 border-green-300 text-green-900",
  },
  declined: {
    label: "Offer Declined",
    description:
      "The offer for this application has been declined. Please contact us if you'd like to reapply.",
    color: "bg-red-50 border-red-200 text-red-800",
  },
  withdrawn: {
    label: "Withdrawn",
    description:
      "This inquiry has been withdrawn. Please contact us if you'd like to re-submit.",
    color: "bg-gray-50 border-gray-200 text-gray-700",
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="The email used for your inquiry"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Child First Name
              </label>
              <input
                type="text"
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Child Last Name
              </label>
              <input
                type="text"
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="w-full rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {isChecking ? "Checking…" : "Check Status"}
          </button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            We couldn't find an inquiry matching those details. Please check the
            spelling matches exactly what you submitted, or{" "}
            <a
              href="/inquiry"
              className="font-medium text-amber-700 hover:underline"
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
    color: "bg-gray-50 border-gray-200 text-gray-700",
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Inquiry Details
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Child</dt>
            <dd className="font-medium text-gray-900">{result.child_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Inquiry Submitted</dt>
            <dd className="font-medium text-gray-900">{inquiryDate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Days Waiting</dt>
            <dd className="font-medium text-gray-900">{result.days_waiting}</dd>
          </div>

          {/* Tour date */}
          {result.tour_date && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Tour Date</dt>
              <dd className="font-medium text-gray-900">
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
              <dt className="text-gray-500">Offered Program</dt>
              <dd className="font-medium text-gray-900">
                {result.offered_program}
              </dd>
            </div>
          )}

          {/* Offer expiry */}
          {result.offer_expires_at && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Offer Expires</dt>
              <dd className="font-medium text-red-600">
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          Have questions? Contact {schoolName} directly for the latest
          information about your inquiry.
        </p>
      </div>
    </div>
  );
}
