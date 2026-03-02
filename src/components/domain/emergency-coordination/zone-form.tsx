"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createZone, updateZone } from "@/lib/actions/emergency-coordination";
import type { EmergencyZone, EmergencyZoneType } from "@/types/domain";

const ZONE_TYPE_OPTIONS: { value: EmergencyZoneType; label: string }[] = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "assembly_point", label: "Assembly Point" },
];

export function ZoneForm({
  zone,
}: {
  zone?: EmergencyZone;
}) {
  const isEdit = !!zone;
  const [name, setName] = useState(zone?.name ?? "");
  const [description, setDescription] = useState(zone?.description ?? "");
  const [zoneType, setZoneType] = useState<EmergencyZoneType>(
    zone?.zone_type ?? "indoor",
  );
  const [locationDetails, setLocationDetails] = useState(
    zone?.location_details ?? "",
  );
  const [capacity, setCapacity] = useState(zone?.capacity?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const haptics = useHaptics();
  const router = useRouter();

  const handleSubmit = useCallback(async () => {
    haptics.impact("medium");
    setLoading(true);
    setError(null);

    const input = {
      name,
      description: description || undefined,
      zone_type: zoneType,
      location_details: locationDetails || undefined,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
    };

    const result = isEdit
      ? await updateZone(zone.id, input)
      : await createZone(input as Parameters<typeof createZone>[0]);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      return;
    }

    haptics.success();
    router.push("/admin/emergency-coordination/zones");
    router.refresh();
  }, [
    name,
    description,
    zoneType,
    locationDetails,
    capacity,
    isEdit,
    zone,
    haptics,
    router,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
          Zone Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          placeholder="e.g. Room 1, Front Oval, North Exit"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-2" style={{ color: "var(--foreground)" }}>
          Zone Type *
        </label>
        <div className="flex gap-2">
          {ZONE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                haptics.selection();
                setZoneType(opt.value);
              }}
              className="active-push touch-target flex-1 rounded-[var(--radius)] px-3 py-2 text-sm font-medium border"
              style={{
                borderColor:
                  zoneType === opt.value ? "var(--primary)" : "var(--border)",
                backgroundColor:
                  zoneType === opt.value ? "var(--primary)" : "var(--card)",
                color:
                  zoneType === opt.value
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
          Location Details
        </label>
        <input
          value={locationDetails}
          onChange={(e) => setLocationDetails(e.target.value)}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          placeholder="e.g. Ground floor, next to reception"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          rows={2}
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: "var(--foreground)" }}>
          Capacity
        </label>
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
          placeholder="e.g. 30"
          inputMode="numeric"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            haptics.impact("light");
            router.back();
          }}
          className="active-push touch-target flex-1 rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="active-push touch-target flex-1 rounded-[var(--radius)] px-4 py-2 text-sm font-bold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: loading || !name.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Saving..." : isEdit ? "Update Zone" : "Create Zone"}
        </button>
      </div>
    </div>
  );
}
