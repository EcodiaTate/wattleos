"use client";

/**
 * Generic list card for simpler structured results that don't
 * need a fully custom component (observations, events, announcements,
 * student list, attendance history, mastery summary, timesheet, program status).
 *
 * Renders a list of labeled items in the WattleOS amber design.
 */

interface GenericListItem {
  label: string;
  sublabel?: string;
  badge?: { text: string; color: string; bg: string };
}

interface Props {
  title: string;
  subtitle?: string;
  items: GenericListItem[];
  emptyMessage?: string;
}

export function GenericListCard({ title, subtitle, items, emptyMessage }: Props) {
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
          {title}
        </span>
        {subtitle && (
          <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
            {subtitle}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
          {emptyMessage ?? "Nothing to show."}
        </span>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ background: "color-mix(in srgb, var(--card) 40%, transparent)" }}
            >
              <div className="min-w-0 flex-1">
                <span className="block text-xs truncate" style={{ color: "var(--wattle-dark)" }}>
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="block text-[10px]" style={{ color: "var(--wattle-tan)" }}>
                    {item.sublabel}
                  </span>
                )}
              </div>
              {item.badge && (
                <span
                  className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: item.badge.bg, color: item.badge.color }}
                >
                  {item.badge.text}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
