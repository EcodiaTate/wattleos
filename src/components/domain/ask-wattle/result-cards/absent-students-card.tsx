"use client";

import type { AbsentStudentsData } from "@/types/ask-wattle";

interface Props {
  data: AbsentStudentsData["data"];
}

export function AbsentStudentsCard({ data }: Props) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--wattle-dark)" }}>
          Absences & Unmarked
        </span>
        <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
          {data.date_display}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {data.classes.map((cls) => (
          <div
            key={cls.class_name}
            className="rounded-lg px-2.5 py-2"
            style={{ background: "color-mix(in srgb, var(--card) 40%, transparent)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--wattle-dark)" }}>
              {cls.class_name}
            </span>
            {cls.absent.length > 0 && (
              <div className="mt-1 text-[11px]" style={{ color: "var(--destructive)" }}>
                Absent ({cls.absent.length}): {cls.absent.join(", ")}
              </div>
            )}
            {cls.unmarked.length > 0 && (
              <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Not marked ({cls.unmarked.length}): {cls.unmarked.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
