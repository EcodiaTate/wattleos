"use client";

import { useState, useTransition } from "react";
import type { ServicePhilosophy } from "@/types/domain";
import { publishPhilosophy } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface PhilosophyEditorClientProps {
  current: ServicePhilosophy | null;
  history: ServicePhilosophy[];
  canManage: boolean;
}

export function PhilosophyEditorClient({
  current,
  history,
  canManage,
}: PhilosophyEditorClientProps) {
  const [content, setContent] = useState(current?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  const hasChanges = content !== (current?.content ?? "");
  const charCount = content.length;

  function handlePublish() {
    if (
      !confirm(
        "Publish this as a new version of the service philosophy? The previous version will be retained in the history.",
      )
    )
      return;

    haptics.impact("heavy");
    startTransition(async () => {
      setError(null);
      const result = await publishPhilosophy({ content });
      if (result.error) {
        haptics.error();
        setError(result.error.message);
      } else {
        haptics.success();
        // Reload to reflect new version
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Service Philosophy Statement
            </h2>
            {current && (
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Version {current.version} - published{" "}
                {new Date(current.published_at!).toLocaleDateString("en-AU")}
              </p>
            )}
          </div>
          {current && (
            <p
              className="text-xs tabular-nums"
              style={{ color: "var(--muted-foreground)" }}
            >
              {charCount.toLocaleString()} characters
            </p>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          disabled={!canManage || isPending}
          placeholder="Write your service's philosophy statement here. This guides all aspects of the service's operations and is required under NQS Element 7.1.1."
          className="w-full resize-none rounded-lg border border-border px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:outline-none"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />

        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--destructive)" }}>
            {error}
          </p>
        )}

        {canManage && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {hasChanges ? "Unsaved changes" : "No changes"}
            </p>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending || !hasChanges || content.trim().length < 10}
              className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                opacity:
                  isPending || !hasChanges || content.trim().length < 10
                    ? 0.5
                    : 1,
              }}
            >
              {isPending ? "Publishing..." : "Publish New Version"}
            </button>
          </div>
        )}
      </div>

      {/* Version history */}
      {history.length > 1 && (
        <div
          className="rounded-xl border border-border"
          style={{ backgroundColor: "var(--card)" }}
        >
          <button
            type="button"
            className="active-push flex w-full items-center justify-between p-4 text-left"
            onClick={() => {
              haptics.impact("light");
              setShowHistory(!showHistory);
            }}
          >
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Version History ({history.length})
            </h3>
            <span
              className="text-lg transition-transform"
              style={{
                color: "var(--muted-foreground)",
                transform: showHistory ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ›
            </span>
          </button>

          {showHistory && (
            <div className="border-t border-border">
              {history.map((version) => (
                <div
                  key={version.id}
                  className="border-b border-border p-4 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      Version {version.version}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {version.published_at
                        ? new Date(version.published_at).toLocaleDateString(
                            "en-AU",
                          )
                        : "Draft"}
                    </span>
                  </div>
                  <p
                    className="mt-1 line-clamp-3 text-xs leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {version.content}
                  </p>
                  {canManage && version.id !== current?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setContent(version.content);
                      }}
                      className="mt-2 text-xs font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      Restore this version
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
