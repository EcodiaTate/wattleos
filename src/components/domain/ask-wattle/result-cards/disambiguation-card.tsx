"use client";

import type { DisambiguationData } from "@/types/ask-wattle";

interface Props {
  data: DisambiguationData["data"];
  onSelect: (fullName: string) => void;
}

export function DisambiguationCard({ data, onSelect }: Props) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      <span
        className="mb-2 block text-xs font-medium"
        style={{ color: "var(--wattle-brown)" }}
      >
        {data.context}
      </span>

      <div className="flex flex-col gap-1.5">
        {data.options.map((option) => (
          <button
            key={option.student_id}
            onClick={() => onSelect(option.display_name)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "color-mix(in srgb, var(--card) 60%, transparent)",
              border: "1px solid var(--wattle-border)",
            }}
          >
            {/* Initials avatar */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
              style={{
                background:
                  "color-mix(in srgb, var(--wattle-gold) 15%, transparent)",
                color: "var(--wattle-brown)",
              }}
            >
              {option.display_name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>

            <div className="flex-1 min-w-0">
              <span
                className="block text-sm font-medium truncate"
                style={{ color: "var(--wattle-dark)" }}
              >
                {option.display_name}
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--wattle-tan)" }}
              >
                {option.class_name ?? "No class"}
                {" - "}
                <span className="capitalize">{option.enrollment_status}</span>
              </span>
            </div>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--wattle-tan)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
