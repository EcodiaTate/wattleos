"use client";

// src/components/domain/dismissal/bus-route-list-client.tsx
//
// Admin bus route management page component

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { deleteBusRoute } from "@/lib/actions/dismissal";
import type { BusRoute } from "@/types/domain";
import { BusRouteForm } from "./bus-route-form";

interface BusRouteListClientProps {
  initialRoutes: BusRoute[];
  canManage: boolean;
}

export function BusRouteListClient({
  initialRoutes,
  canManage,
}: BusRouteListClientProps) {
  const haptics = useHaptics();
  const [routes, setRoutes] = useState(initialRoutes);
  const [showForm, setShowForm]   = useState(false);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSaved(route: BusRoute) {
    setRoutes((prev) => {
      const idx = prev.findIndex((r) => r.id === route.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = route;
        return updated;
      }
      return [route, ...prev];
    });
    setShowForm(false);
    setEditRoute(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this bus route? Historical records will be preserved.")) return;
    setDeletingId(id);
    haptics.impact("heavy");
    const result = await deleteBusRoute(id);
    if (result.error) {
      setError(result.error.message);
    } else {
      haptics.success();
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    }
    setDeletingId(null);
  }

  const activeRoutes   = routes.filter((r) => r.is_active);
  const inactiveRoutes = routes.filter((r) => !r.is_active);

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          {!showForm && !editRoute && (
            <button
              type="button"
              className="touch-target rounded-xl px-4 py-2.5 text-sm font-semibold active-push"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
              onClick={() => {
                haptics.selection();
                setShowForm(true);
              }}
            >
              + Add bus route
            </button>
          )}
        </div>
      )}

      {(showForm || editRoute) && (
        <div
          className="rounded-2xl border border-border p-6"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            {editRoute ? "Edit bus route" : "New bus route"}
          </h3>
          <BusRouteForm
            route={editRoute ?? undefined}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditRoute(null); }}
          />
        </div>
      )}

      {error && (
        <p className="text-sm p-3 rounded-lg" style={{ color: "var(--destructive)", backgroundColor: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}>
          {error}
        </p>
      )}

      {activeRoutes.length === 0 && !showForm ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl" style={{ color: "var(--empty-state-icon)" }}>🚌</div>
          <p className="font-medium" style={{ color: "var(--foreground)" }}>No bus routes configured</p>
          {canManage && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Add a bus route to enable bus confirmation in the dismissal dashboard.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeRoutes.map((route) => (
            <div
              key={route.id}
              className="rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                      🚌 {route.route_name}
                    </span>
                    {route.depart_time && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--dismissal-bus-bg)",
                          color: "var(--dismissal-bus-fg)",
                        }}
                      >
                        {route.depart_time.substring(0, 5)}
                      </span>
                    )}
                  </div>

                  {/* Days */}
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {route.days_of_operation.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}
                  </p>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {route.operator_name && <span>🏢 {route.operator_name}</span>}
                    {route.driver_name && <span>👤 {route.driver_name}</span>}
                    {route.driver_phone && <span>📞 {route.driver_phone}</span>}
                    {route.vehicle_registration && <span>🚗 {route.vehicle_registration}</span>}
                  </div>

                  {route.notes && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--muted-foreground)" }}>
                      {route.notes}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs active-push"
                      style={{ color: "var(--foreground)" }}
                      onClick={() => {
                        haptics.selection();
                        setEditRoute(route);
                        setShowForm(false);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === route.id}
                      className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs active-push"
                      style={{ color: "var(--destructive)", opacity: deletingId === route.id ? 0.5 : 1 }}
                      onClick={() => handleDelete(route.id)}
                    >
                      {deletingId === route.id ? "…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveRoutes.length > 0 && (
        <details className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          <summary className="cursor-pointer">
            {inactiveRoutes.length} inactive route{inactiveRoutes.length !== 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {inactiveRoutes.map((r) => (
              <li key={r.id} className="italic">{r.route_name}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
