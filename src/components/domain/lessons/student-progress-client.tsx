"use client";

import type { StudentLessonProgressSummary } from "@/lib/actions/lesson-tracking";

const AREA_LABELS: Record<string, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREA_EMOJI: Record<string, string> = {
  practical_life: "🏠",
  sensorial: "👐",
  language: "📖",
  mathematics: "🔢",
  cultural: "🌍",
};

const STAGE_LABELS: Record<string, string> = {
  introduction: "Introduced",
  practice: "Practicing",
  mastery: "Mastered",
};

const STAGE_COLORS: Record<string, { bg: string; fg: string }> = {
  introduction: {
    bg: "var(--attendance-late-bg, hsl(32 95% 93%))",
    fg: "var(--attendance-late-fg, hsl(32 95% 34%))",
  },
  practice: {
    bg: "var(--mastery-practicing-bg, hsl(210 80% 93%))",
    fg: "var(--mastery-practicing-fg, hsl(210 80% 32%))",
  },
  mastery: {
    bg: "var(--attendance-present-bg, hsl(142 71% 93%))",
    fg: "var(--attendance-present-fg, hsl(142 71% 29%))",
  },
};

export function StudentProgressClient({
  data,
}: {
  data: StudentLessonProgressSummary;
}) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className="rounded-[var(--radius-md)] border border-border p-3 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {data.total_lessons}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Total Lessons
          </div>
        </div>
        <div
          className="rounded-[var(--radius-md)] border border-border p-3 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: STAGE_COLORS.mastery.fg }}
          >
            {data.areas.reduce((sum, a) => sum + a.mastered, 0)}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Mastered
          </div>
        </div>
        <div
          className="rounded-[var(--radius-md)] border border-border p-3 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: STAGE_COLORS.practice.fg }}
          >
            {data.areas.reduce((sum, a) => sum + a.practicing, 0)}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Practicing
          </div>
        </div>
        <div
          className="rounded-[var(--radius-md)] border border-border p-3 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {data.total_materials}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Materials
          </div>
        </div>
      </div>

      {/* Per-area breakdown */}
      <div className="space-y-3">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Curriculum Areas
        </h2>

        {data.areas.map((area) => (
          <div
            key={area.area}
            className="rounded-[var(--radius-md)] border border-border p-4"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {AREA_EMOJI[area.area] ?? "📚"}
                </span>
                <span
                  className="font-medium text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {AREA_LABELS[area.area] ?? area.area}
                </span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {area.completion_percent}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="h-3 w-full rounded-full overflow-hidden"
              style={{ background: "var(--muted)" }}
            >
              <div className="h-full flex">
                {area.mastered > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(area.mastered / area.total_materials) * 100}%`,
                      background: STAGE_COLORS.mastery.fg,
                    }}
                  />
                )}
                {area.practicing > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(area.practicing / area.total_materials) * 100}%`,
                      background: STAGE_COLORS.practice.fg,
                    }}
                  />
                )}
                {area.introduced > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(area.introduced / area.total_materials) * 100}%`,
                      background: STAGE_COLORS.introduction.fg,
                    }}
                  />
                )}
              </div>
            </div>

            <div
              className="mt-2 flex flex-wrap gap-3 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>
                {area.mastered} mastered
              </span>
              <span>
                {area.practicing} practicing
              </span>
              <span>
                {area.introduced} introduced
              </span>
              <span>
                {area.not_started} not started
              </span>
              <span>
                {area.total_materials} total
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent lessons */}
      {data.recent_lessons.length > 0 && (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Recent Lessons
          </h2>

          <div className="space-y-2">
            {data.recent_lessons.map((lesson, i) => {
              const stageColor = STAGE_COLORS[lesson.stage] ?? STAGE_COLORS.introduction;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border p-3"
                  style={{ background: "var(--card)" }}
                >
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {lesson.material_name}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {AREA_LABELS[lesson.area] ?? lesson.area} ·{" "}
                      {new Date(lesson.date + "T00:00").toLocaleDateString(
                        "en-AU",
                        { day: "numeric", month: "short" },
                      )}
                      {lesson.child_response &&
                        ` · ${lesson.child_response}`}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: stageColor.bg,
                      color: stageColor.fg,
                    }}
                  >
                    {STAGE_LABELS[lesson.stage] ?? lesson.stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
