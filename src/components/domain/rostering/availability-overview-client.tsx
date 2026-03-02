"use client";

interface StaffAvailRow {
  user_id: string;
  user_name: string;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
}

export function AvailabilityOverviewClient({
  availability,
}: {
  availability: StaffAvailRow[];
}) {
  const available = availability.filter((a) => a.is_available);
  const unavailable = availability.filter((a) => !a.is_available);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Available Today ({available.length})
          </h3>
          {available.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>None</p>
          ) : (
            <div className="space-y-1">
              {available.map((a) => (
                <div key={a.user_id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--foreground)" }}>{a.user_name}</span>
                  {a.available_from && (
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {a.available_from}–{a.available_until}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--destructive)" }}>
            Unavailable Today ({unavailable.length})
          </h3>
          {unavailable.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>None</p>
          ) : (
            <div className="space-y-1">
              {unavailable.map((a) => (
                <div key={a.user_id} className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {a.user_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
