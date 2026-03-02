"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { activateEmergency } from "@/lib/actions/emergency-coordination";
import type {
  EmergencyEventType,
  EmergencyEventSeverity,
} from "@/types/domain";

const EVENT_TYPE_LABELS: Record<EmergencyEventType, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

const SEVERITY_LABELS: Record<EmergencyEventSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

export function EmergencyActivationButton({
  hasActiveEvent,
}: {
  hasActiveEvent: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [eventType, setEventType] =
    useState<EmergencyEventType>("fire_evacuation");
  const [severity, setSeverity] = useState<EmergencyEventSeverity>("high");
  const [instructions, setInstructions] = useState("");
  const [assemblyPoint, setAssemblyPoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const haptics = useHaptics();
  const router = useRouter();

  const handleInitiate = useCallback(() => {
    haptics.impact("heavy");
    setShowForm(true);
    setError(null);
  }, [haptics]);

  const handlePrepareConfirm = useCallback(() => {
    haptics.impact("medium");
    setShowConfirm(true);
  }, [haptics]);

  const handleActivate = useCallback(async () => {
    haptics.impact("heavy");
    setLoading(true);
    setError(null);

    const result = await activateEmergency({
      event_type: eventType,
      severity,
      event_type_other: null,
      location_description: null,
      instructions: instructions || null,
      assembly_point: assemblyPoint || null,
      linked_drill_id: null,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      return;
    }

    haptics.success();
    setShowForm(false);
    setShowConfirm(false);
    router.push("/admin/emergency-coordination/active");
    router.refresh();
  }, [eventType, severity, instructions, assemblyPoint, haptics, router]);

  if (hasActiveEvent) {
    return (
      <button
        onClick={() => {
          haptics.impact("medium");
          router.push("/admin/emergency-coordination/active");
        }}
        className="active-push touch-target w-full rounded-[var(--radius-lg)] px-4 py-3 text-center font-bold animate-pulse"
        style={{
          backgroundColor: "var(--emergency-activated)",
          color: "var(--emergency-activated-fg)",
        }}
      >
        EMERGENCY ACTIVE - TAP TO VIEW
      </button>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={handleInitiate}
        className="active-push touch-target w-full rounded-[var(--radius-lg)] px-6 py-4 text-center font-bold text-lg"
        style={{
          backgroundColor: "var(--emergency-activated)",
          color: "var(--emergency-activated-fg)",
        }}
      >
        ACTIVATE EMERGENCY
      </button>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 space-y-4"
      style={{
        borderColor: "var(--emergency-activated)",
        backgroundColor: "var(--emergency-activated-bg)",
      }}
    >
      <h3
        className="font-bold text-lg"
        style={{ color: "var(--emergency-activated)" }}
      >
        Activate Emergency
      </h3>

      {/* Type selection */}
      <div>
        <label
          className="text-sm font-medium block mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Emergency Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EVENT_TYPE_LABELS) as EmergencyEventType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => {
                  haptics.selection();
                  setEventType(type);
                }}
                className="active-push touch-target rounded-[var(--radius)] px-3 py-2 text-sm font-medium border"
                style={{
                  borderColor:
                    eventType === type
                      ? "var(--emergency-activated)"
                      : "var(--border)",
                  backgroundColor:
                    eventType === type
                      ? "var(--emergency-activated)"
                      : "var(--card)",
                  color:
                    eventType === type
                      ? "var(--emergency-activated-fg)"
                      : "var(--foreground)",
                }}
              >
                {EVENT_TYPE_LABELS[type]}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Severity selection */}
      <div>
        <label
          className="text-sm font-medium block mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Severity
        </label>
        <div className="flex gap-2">
          {(Object.keys(SEVERITY_LABELS) as EmergencyEventSeverity[]).map(
            (sev) => (
              <button
                key={sev}
                onClick={() => {
                  haptics.selection();
                  setSeverity(sev);
                }}
                className="active-push touch-target flex-1 rounded-[var(--radius)] px-3 py-2 text-sm font-medium border"
                style={{
                  borderColor:
                    severity === sev
                      ? `var(--emergency-${sev})`
                      : "var(--border)",
                  backgroundColor:
                    severity === sev
                      ? `var(--emergency-${sev})`
                      : "var(--card)",
                  color:
                    severity === sev
                      ? `var(--emergency-${sev}-fg)`
                      : "var(--foreground)",
                }}
              >
                {SEVERITY_LABELS[sev]}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label
          className="text-sm font-medium block mb-1"
          style={{ color: "var(--foreground)" }}
        >
          Instructions (optional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          rows={2}
          placeholder="e.g. Evacuate via north exit, assemble at oval"
        />
      </div>

      {/* Assembly point */}
      <div>
        <label
          className="text-sm font-medium block mb-1"
          style={{ color: "var(--foreground)" }}
        >
          Assembly Point (optional)
        </label>
        <input
          value={assemblyPoint}
          onChange={(e) => setAssemblyPoint(e.target.value)}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          placeholder="e.g. Front oval"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Confirm / Cancel */}
      {!showConfirm ? (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(false);
              haptics.impact("light");
            }}
            className="active-push touch-target flex-1 rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrepareConfirm}
            className="active-push touch-target flex-1 rounded-[var(--radius)] px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: "var(--emergency-activated)",
              color: "var(--emergency-activated-fg)",
            }}
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-[var(--radius)] p-3 text-center"
            style={{
              backgroundColor: "var(--emergency-critical-bg)",
              borderColor: "var(--emergency-critical)",
              borderWidth: "2px",
              borderStyle: "solid",
            }}
          >
            <p
              className="font-bold text-sm"
              style={{ color: "var(--emergency-critical)" }}
            >
              Are you sure? This will alert ALL staff.
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {EVENT_TYPE_LABELS[eventType]} · {SEVERITY_LABELS[severity]}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowConfirm(false);
                haptics.impact("light");
              }}
              className="active-push touch-target flex-1 rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
              disabled={loading}
            >
              Go Back
            </button>
            <button
              onClick={handleActivate}
              disabled={loading}
              className="active-push touch-target flex-1 rounded-[var(--radius)] px-4 py-3 text-sm font-bold"
              style={{
                backgroundColor: "var(--emergency-critical)",
                color: "var(--emergency-critical-fg)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "ACTIVATING..." : "ACTIVATE NOW"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
