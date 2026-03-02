"use client";

import type { ClassListData } from "@/types/ask-wattle";

interface Props {
  data: ClassListData["data"];
}

export function ClassListCard({ data }: Props) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      <div className="flex flex-col gap-1">
        {data.classes.map((cls) => (
          <div
            key={cls.id}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{ background: "color-mix(in srgb, var(--card) 40%, transparent)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium"
                style={{ background: "color-mix(in srgb, var(--wattle-gold) 15%, transparent)", color: "var(--wattle-brown)" }}
              >
                {cls.name[0]}
              </span>
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--wattle-dark)" }}>
                  {cls.name}
                </span>
                {cls.room && (
                  <span className="ml-1.5 text-[11px]" style={{ color: "var(--wattle-tan)" }}>
                    Room {cls.room}
                  </span>
                )}
              </div>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "color-mix(in srgb, var(--wattle-gold) 10%, transparent)", color: "var(--wattle-brown)" }}
            >
              {cls.student_count} {cls.student_count === 1 ? "student" : "students"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
