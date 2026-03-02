"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { getEvent, respondToEvent } from "@/lib/actions/comms/school-events";
import type {
  SchoolEventWithDetails,
  RSVPStatus,
} from "@/lib/actions/comms/school-events";

interface Props {
  params: Promise<{ id: string }>;
}

const RSVP_OPTIONS: {
  value: RSVPStatus;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { value: "going", label: "Going", bg: "var(--success)", fg: "#fff" },
  { value: "maybe", label: "Maybe", bg: "var(--warning)", fg: "#fff" },
  {
    value: "not_going",
    label: "Can't Make It",
    bg: "var(--muted)",
    fg: "var(--foreground)",
  },
];

export default function ParentEventDetailPage({ params }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [event, setEvent] = useState<SchoolEventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      getEvent(id).then((result) => {
        if (!result.error && result.data) {
          setEvent(result.data);
        } else {
          setError(result.error?.message ?? "Event not found");
        }
        setLoading(false);
      });
    });
  }, [params]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {error ?? "Event not found."}
        </p>
        <Link
          href="/parent/events"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to events
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;

  function handleRSVP(status: RSVPStatus) {
    if (!event) return;
    startTransition(async () => {
      const result = await respondToEvent(event.id, status);
      if (!result.error) {
        haptics.success();
        // Refresh event data
        const refreshed = await getEvent(event.id);
        if (!refreshed.error && refreshed.data) setEvent(refreshed.data);
      } else {
        haptics.error();
      }
    });
  }

  const rsvpDeadlinePassed = event.rsvp_deadline
    ? new Date(event.rsvp_deadline) < new Date()
    : false;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/parent/events"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Events
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>
          {event.title}
        </span>
      </div>

      {/* Event details */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {event.title}
        </h1>

        <div
          className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>
            {startDate.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span>
            {startDate.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {endDate && (
              <>
                {" - "}
                {endDate.toLocaleTimeString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </span>
          {event.location && <span>{event.location}</span>}
        </div>

        {event.description && (
          <p
            className="mt-3 text-sm whitespace-pre-wrap"
            style={{ color: "var(--foreground)" }}
          >
            {event.description}
          </p>
        )}

        {/* RSVP summary */}
        {event.rsvp_enabled && event.rsvp_summary && (
          <div
            className="mt-4 flex items-center gap-3 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>{event.rsvp_summary.going} going</span>
            <span>{event.rsvp_summary.maybe} maybe</span>
            <span>{event.rsvp_summary.not_going} not going</span>
          </div>
        )}
      </div>

      {/* RSVP section */}
      {event.rsvp_enabled && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Your RSVP
          </h2>

          {rsvpDeadlinePassed ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              The RSVP deadline has passed.
              {event.my_rsvp && (
                <span>
                  {" "}
                  Your response:{" "}
                  <strong>{event.my_rsvp.status.replace("_", " ")}</strong>
                </span>
              )}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {RSVP_OPTIONS.map((option) => {
                const isSelected = event.my_rsvp?.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRSVP(option.value)}
                    disabled={isPending}
                    className="active-push touch-target rounded-[var(--radius-md)] border-2 px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                    style={{
                      borderColor: isSelected ? option.bg : "var(--border)",
                      background: isSelected ? option.bg : "transparent",
                      color: isSelected ? option.fg : "var(--foreground)",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {event.rsvp_deadline && !rsvpDeadlinePassed && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              RSVP by{" "}
              {new Date(event.rsvp_deadline).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
