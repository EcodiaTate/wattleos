// src/components/domain/comms/EventForm.tsx
//
// WHY client component: Multiple interactive controls for
// event type, date/time pickers, scope, RSVP configuration.

"use client";

import {
  createEvent,
  type EventScope,
  type EventType,
  type SchoolEvent,
} from "@/lib/actions/comms/school-events";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface EventFormProps {
  classes: Array<{ id: string; name: string }>;
  existing?: SchoolEvent;
}

const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: "general", label: "General", icon: "📋" },
  { value: "excursion", label: "Excursion", icon: "🚌" },
  { value: "parent_meeting", label: "Parent Meeting", icon: "👥" },
  { value: "performance", label: "Performance", icon: "🎭" },
  { value: "sports_day", label: "Sports Day", icon: "⚽" },
  { value: "fundraiser", label: "Fundraiser", icon: "💰" },
  { value: "professional_development", label: "PD Day", icon: "📚" },
  { value: "public_holiday", label: "Public Holiday", icon: "🏖️" },
  { value: "pupil_free_day", label: "Pupil Free Day", icon: "🏠" },
  { value: "term_start", label: "Term Start", icon: "🎒" },
  { value: "term_end", label: "Term End", icon: "🎉" },
];

export function EventForm({ classes, existing }: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [eventType, setEventType] = useState<EventType>(
    existing?.event_type ?? "general",
  );
  const [startAt, setStartAt] = useState(
    existing?.start_at
      ? new Date(existing.start_at).toISOString().slice(0, 16)
      : "",
  );
  const [endAt, setEndAt] = useState(
    existing?.end_at
      ? new Date(existing.end_at).toISOString().slice(0, 16)
      : "",
  );
  const [allDay, setAllDay] = useState(existing?.all_day ?? false);
  const [location, setLocation] = useState(existing?.location ?? "");
  const [locationUrl, setLocationUrl] = useState(existing?.location_url ?? "");
  const [scope, setScope] = useState<EventScope>(existing?.scope ?? "school");
  const [targetClassId, setTargetClassId] = useState(
    existing?.target_class_id ?? "",
  );
  const [rsvpEnabled, setRsvpEnabled] = useState(
    existing?.rsvp_enabled ?? true,
  );
  const [rsvpDeadline, setRsvpDeadline] = useState(
    existing?.rsvp_deadline
      ? new Date(existing.rsvp_deadline).toISOString().slice(0, 16)
      : "",
  );
  const [maxAttendees, setMaxAttendees] = useState(
    existing?.max_attendees?.toString() ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!startAt) {
      setError("Start date/time is required");
      return;
    }
    if (scope === "class" && !targetClassId) {
      setError("Please select a target class");
      return;
    }

    startTransition(async () => {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        all_day: allDay,
        location: location.trim() || undefined,
        location_url: locationUrl.trim() || undefined,
        scope,
        target_class_id: scope === "class" ? targetClassId : undefined,
        rsvp_enabled: rsvpEnabled,
        rsvp_deadline: rsvpDeadline
          ? new Date(rsvpDeadline).toISOString()
          : undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push(`/comms/events`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Event Type ────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          Event Type
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_TYPES.map((et) => (
            <button
              key={et.value}
              type="button"
              onClick={() => setEventType(et.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                eventType === et.value
                  ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{et.icon}</span>
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Title ─────────────────────────────────────── */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground"
        >
          Title
        </label>
        <GlowTarget id="comms-input-event-title" category="input" label="Event title">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Term 2 Parent Information Evening"
            className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </GlowTarget>
      </div>

      {/* ── Description ───────────────────────────────── */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide details about the event..."
          className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── Date/Time ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted p-4 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">
            All-day event
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startAt"
              className="block text-sm font-medium text-foreground"
            >
              {allDay ? "Date" : "Start"}
            </label>
            <GlowTarget id="comms-input-event-date" category="input" label="Event date">
              <input
                id="startAt"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </GlowTarget>
          </div>
          {!allDay && (
            <div>
              <label
                htmlFor="endAt"
                className="block text-sm font-medium text-foreground"
              >
                End (optional)
              </label>
              <input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Location ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-foreground"
          >
            Location (optional)
          </label>
          <GlowTarget id="comms-input-event-location" category="input" label="Event location">
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. School Hall"
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </GlowTarget>
        </div>
        <div>
          <label
            htmlFor="locationUrl"
            className="block text-sm font-medium text-foreground"
          >
            Map / Link (optional)
          </label>
          <input
            id="locationUrl"
            type="url"
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ── Scope ─────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Audience
          </label>
          <div className="mt-2 flex gap-2">
            {(["school", "class", "staff"] as EventScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  scope === s
                    ? "bg-primary text-background"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                }`}
              >
                {s === "school"
                  ? "Whole School"
                  : s === "class"
                    ? "Specific Class"
                    : "Staff Only"}
              </button>
            ))}
          </div>
        </div>

        {scope === "class" && (
          <div>
            <label
              htmlFor="targetClass"
              className="block text-sm font-medium text-foreground"
            >
              Target Class
            </label>
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── RSVP Settings ─────────────────────────────── */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rsvpEnabled}
            onChange={(e) => setRsvpEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              Enable RSVPs
            </span>
            <p className="text-xs text-muted-foreground">
              Allow parents to respond Going / Not Going / Maybe
            </p>
          </div>
        </label>

        {rsvpEnabled && (
          <div className="ml-7 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rsvpDeadline"
                className="block text-sm font-medium text-foreground"
              >
                RSVP Deadline (optional)
              </label>
              <input
                id="rsvpDeadline"
                type="datetime-local"
                value={rsvpDeadline}
                onChange={(e) => setRsvpDeadline(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="maxAttendees"
                className="block text-sm font-medium text-foreground"
              >
                Max Attendees (optional)
              </label>
              <input
                id="maxAttendees"
                type="number"
                min="1"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                placeholder="Unlimited"
                className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <GlowTarget id="comms-btn-event-submit" category="button" label="Create event">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-primary disabled:opacity-50"
          >
            {isPending
              ? "Creating..."
              : existing
                ? "Update Event"
                : "Create Event"}
          </button>
        </GlowTarget>
      </div>
    </div>
  );
}
