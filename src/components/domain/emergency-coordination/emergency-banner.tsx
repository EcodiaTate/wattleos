"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  useEmergencyBanner,
  type ActiveEmergencyBanner,
} from "@/lib/hooks/use-emergency-banner";

const EVENT_TYPE_SHORT: Record<string, string> = {
  fire_evacuation: "FIRE",
  lockdown: "LOCKDOWN",
  shelter_in_place: "SHELTER",
  medical_emergency: "MEDICAL",
  other: "EMERGENCY",
};

function ElapsedCompact({ since }: { since: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const start = new Date(since).getTime();
    function update() {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setText(`${m}:${s.toString().padStart(2, "0")}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [since]);

  return <span className="font-mono tabular-nums">{text}</span>;
}

export function EmergencyBanner({
  tenantId,
  initialData,
}: {
  tenantId: string;
  initialData: ActiveEmergencyBanner | null;
}) {
  const data = useEmergencyBanner(tenantId, initialData);
  const router = useRouter();
  const haptics = useHaptics();

  if (!data) return null;

  const hasUnaccounted = data.students_unaccounted > 0;
  const isCritical = data.severity === "critical";

  return (
    <button
      onClick={() => {
        haptics.impact("medium");
        router.push("/admin/emergency-coordination/active");
      }}
      className="active-push w-full px-4 py-2.5 flex items-center gap-3"
      style={{
        backgroundColor: hasUnaccounted
          ? isCritical
            ? "var(--emergency-critical)"
            : "var(--emergency-activated)"
          : "var(--emergency-all-clear)",
        color: hasUnaccounted
          ? isCritical
            ? "var(--emergency-critical-fg)"
            : "var(--emergency-activated-fg)"
          : "var(--emergency-all-clear-fg)",
        backgroundImage: hasUnaccounted
          ? "linear-gradient(90deg, transparent 0%, hsla(0,0%,100%,0.08) 50%, transparent 100%)"
          : undefined,
        backgroundSize: hasUnaccounted ? "200% 100%" : undefined,
        animation: hasUnaccounted
          ? "emergency-banner-sweep 3s linear infinite"
          : undefined,
      }}
    >
      {/* Event type */}
      <span className="font-bold text-sm sm:text-base shrink-0">
        {EVENT_TYPE_SHORT[data.event_type] ?? "EMERGENCY"} ACTIVE
      </span>

      {/* Unaccounted count */}
      {hasUnaccounted && (
        <span className="font-extrabold text-sm sm:text-base tabular-nums">
          {data.students_unaccounted} UNACCOUNTED
        </span>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Elapsed time */}
      <span className="text-sm sm:text-base shrink-0">
        <ElapsedCompact since={data.activated_at} />
      </span>

      {/* CTA */}
      <span className="text-xs font-medium shrink-0">TAP \u2192</span>
    </button>
  );
}
