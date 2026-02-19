// src/components/domain/reports/TemplateBuilder.tsx
//
// ============================================================
// WattleOS V2 - Report Template Builder (Client Component)
// ============================================================
// Interactive section composer for report templates. Schools
// add, remove, reorder, and configure sections to design their
// report format.
//
// WHY client: All interactions (drag-to-reorder, expand/collapse
// config panels, add/remove sections) are client-side state.
// Only the Save action hits the server.
//
// Uses up/down buttons for reordering - reliable and accessible
// without requiring a drag-and-drop library dependency.
// ============================================================

"use client";

import { updateReportTemplate } from "@/lib/actions/reports";
import type {
  TemplateContent,
  TemplateSection,
  TemplateSectionConfig,
  TemplateSectionType,
} from "@/lib/reports/types";
import { SECTION_TYPE_CATALOG } from "@/lib/reports/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface TemplateBuilderProps {
  templateId: string;
  templateName: string;
  cycleLevel: string | null;
  initialContent: TemplateContent;
}

export function TemplateBuilder({
  templateId,
  templateName,
  cycleLevel,
  initialContent,
}: TemplateBuilderProps) {
  const [sections, setSections] = useState<TemplateSection[]>(
    initialContent?.sections ?? [],
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  // ── Section Management ──────────────────────────────────

  const markDirty = useCallback(() => {
    setHasChanges(true);
    setSaveStatus("idle");
  }, []);

  function addSection(type: TemplateSectionType) {
    const info = SECTION_TYPE_CATALOG.find((s) => s.type === type);
    if (!info) return;

    // Check if non-multiple section already exists
    if (!info.allowMultiple) {
      const exists = sections.some((s) => s.type === type);
      if (exists) return;
    }

    const newSection: TemplateSection = {
      id: crypto.randomUUID(),
      type,
      title: info.label,
      order: sections.length,
      config: getDefaultConfig(type),
    };

    setSections((prev) => [...prev, newSection]);
    setShowCatalog(false);
    setExpandedSection(newSection.id);
    markDirty();
  }

  function removeSection(sectionId: string) {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      // Re-index orders
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    }
    markDirty();
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newSections = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newSections[index], newSections[swapIndex]] = [
        newSections[swapIndex],
        newSections[index],
      ];

      // Re-index orders
      return newSections.map((s, i) => ({ ...s, order: i }));
    });
    markDirty();
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
    markDirty();
  }

  function updateSectionConfig(
    sectionId: string,
    config: TemplateSectionConfig,
  ) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, config } : s)),
    );
    markDirty();
  }

  // ── Save ────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    const content: TemplateContent = {
      version: 1,
      sections,
    };

    const result = await updateReportTemplate(templateId, { content });

    if (result.error) {
      setSaveError(result.error.message);
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setHasChanges(false);
      router.refresh();
    }

    setIsSaving(false);
  }

  // ── Derived State ───────────────────────────────────────

  const availableSections = SECTION_TYPE_CATALOG.filter((info) => {
    if (info.allowMultiple) return true;
    return !sections.some((s) => s.type === info.type);
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
          {hasChanges && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Unsaved changes
            </span>
          )}
          {saveStatus === "saved" && !hasChanges && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            + Add Section
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Section catalog (add panel) */}
      {showCatalog && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Add a Section
            </h3>
            <button
              onClick={() => setShowCatalog(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          {availableSections.length === 0 ? (
            <p className="text-sm text-gray-500">
              All single-use section types are already in the template.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {availableSections.map((info) => (
                <button
                  key={info.type}
                  onClick={() => addSection(info.type)}
                  className="rounded-md border border-amber-200 bg-white p-3 text-left transition-all hover:border-amber-400 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <SectionIcon
                      type={info.type}
                      className="h-4 w-4 text-amber-600"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {info.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {info.description}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {info.isAutoPopulated && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        Auto
                      </span>
                    )}
                    {info.isEditable && (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                        Editable
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section list */}
      {sections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No sections yet. Click &ldquo;Add Section&rdquo; to start building
            your template.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              totalSections={sections.length}
              isExpanded={expandedSection === section.id}
              onToggleExpand={() =>
                setExpandedSection(
                  expandedSection === section.id ? null : section.id,
                )
              }
              onMoveUp={() => moveSection(section.id, "up")}
              onMoveDown={() => moveSection(section.id, "down")}
              onRemove={() => removeSection(section.id)}
              onUpdateTitle={(title) => updateSectionTitle(section.id, title)}
              onUpdateConfig={(config) =>
                updateSectionConfig(section.id, config)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SectionCard - individual section in the builder
// ============================================================

interface SectionCardProps {
  section: TemplateSection;
  index: number;
  totalSections: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateConfig: (config: TemplateSectionConfig) => void;
}

function SectionCard({
  section,
  index,
  totalSections,
  isExpanded,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateTitle,
  onUpdateConfig,
}: SectionCardProps) {
  const info = SECTION_TYPE_CATALOG.find((s) => s.type === section.type);

  return (
    <div
      className={`rounded-lg border bg-white transition-shadow ${
        isExpanded ? "border-amber-300 shadow-sm" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move section up"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 15.75 7.5-7.5 7.5 7.5"
              />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalSections - 1}
            className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move section down"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </div>

        {/* Section number */}
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
          {index + 1}
        </span>

        {/* Icon + title */}
        <SectionIcon
          type={section.type}
          className="h-4 w-4 flex-shrink-0 text-gray-400"
        />
        <button
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="truncate text-sm font-medium text-gray-900">
            {section.title}
          </span>
          <span className="flex-shrink-0 text-xs text-gray-400">
            {info?.label !== section.title ? `(${info?.label})` : ""}
          </span>
        </button>

        {/* Badges */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {info?.isAutoPopulated && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              Auto
            </span>
          )}
          {info?.isEditable && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
              Editable
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label="Remove section"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Config panel (expanded) */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <SectionConfigPanel
            section={section}
            onUpdateTitle={onUpdateTitle}
            onUpdateConfig={onUpdateConfig}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SectionConfigPanel - type-specific config fields
// ============================================================

interface SectionConfigPanelProps {
  section: TemplateSection;
  onUpdateTitle: (title: string) => void;
  onUpdateConfig: (config: TemplateSectionConfig) => void;
}

function SectionConfigPanel({
  section,
  onUpdateTitle,
  onUpdateConfig,
}: SectionConfigPanelProps) {
  const config = section.config;

  return (
    <div className="space-y-4">
      {/* Section title (always editable) */}
      <div>
        <label className="block text-xs font-medium text-gray-600">
          Section Heading
        </label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Type-specific config */}
      {(section.type === "mastery_grid" ||
        section.type === "mastery_summary") && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Curriculum Area Filter
            </label>
            <input
              type="text"
              value={config.curriculumAreaFilter ?? "all"}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  curriculumAreaFilter: e.target.value,
                })
              }
              placeholder="all (or enter an area name)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter &ldquo;all&rdquo; for all areas, or a specific area name
              like &ldquo;Practical Life&rdquo;
            </p>
          </div>
          {section.type === "mastery_summary" && (
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Display Mode
              </label>
              <select
                value={config.displayMode ?? "both"}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    displayMode: e.target.value as
                      | "percentage"
                      | "counts"
                      | "both",
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="both">Counts & Percentages</option>
                <option value="percentage">Percentages Only</option>
                <option value="counts">Counts Only</option>
              </select>
            </div>
          )}
        </>
      )}

      {section.type === "observation_highlights" && (
        <div>
          <label className="block text-xs font-medium text-gray-600">
            Max Observations
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={config.maxObservations ?? 5}
            onChange={(e) =>
              onUpdateConfig({
                ...config,
                maxObservations: parseInt(e.target.value, 10) || 5,
              })
            }
            className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-gray-400">
            Number of recent published observations to include
          </p>
        </div>
      )}

      {section.type === "attendance_summary" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`showDetails-${section.id}`}
            checked={config.showDetails ?? false}
            onChange={(e) =>
              onUpdateConfig({ ...config, showDetails: e.target.checked })
            }
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <label
            htmlFor={`showDetails-${section.id}`}
            className="text-xs text-gray-600"
          >
            Show daily breakdown (in addition to totals)
          </label>
        </div>
      )}

      {(section.type === "narrative" ||
        section.type === "custom_text" ||
        section.type === "goals") && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Placeholder Text
            </label>
            <textarea
              value={config.placeholder ?? ""}
              onChange={(e) =>
                onUpdateConfig({ ...config, placeholder: e.target.value })
              }
              rows={2}
              placeholder="Hint text shown to the teacher when writing this section..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Suggested Minimum Words
            </label>
            <input
              type="number"
              min={0}
              value={config.suggestedMinWords ?? 0}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  suggestedMinWords: parseInt(e.target.value, 10) || 0,
                })
              }
              className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-gray-400">
              Guidance only - not enforced. Set to 0 to disable.
            </p>
          </div>
        </>
      )}

      {section.type === "student_info" && (
        <p className="text-xs text-gray-500">
          This section automatically shows the student&apos;s name, class, date
          of birth, and photo. No configuration needed.
        </p>
      )}
    </div>
  );
}

// ============================================================
// SectionIcon - icon per section type
// ============================================================

function SectionIcon({
  type,
  className,
}: {
  type: TemplateSectionType;
  className?: string;
}) {
  const iconPaths: Record<TemplateSectionType, string> = {
    student_info:
      "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    narrative:
      "M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    mastery_grid:
      "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125",
    mastery_summary:
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    attendance_summary:
      "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z",
    observation_highlights:
      "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    custom_text:
      "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    goals:
      "M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z",
  };

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[type]} />
    </svg>
  );
}

// ============================================================
// Default config per section type
// ============================================================

function getDefaultConfig(type: TemplateSectionType): TemplateSectionConfig {
  switch (type) {
    case "student_info":
      return {};
    case "narrative":
      return {
        placeholder:
          "Write about the student's progress, strengths, and areas for growth...",
        suggestedMinWords: 50,
      };
    case "mastery_grid":
      return { curriculumAreaFilter: "all" };
    case "mastery_summary":
      return { curriculumAreaFilter: "all", displayMode: "both" };
    case "attendance_summary":
      return { showDetails: false };
    case "observation_highlights":
      return { maxObservations: 5, publishedOnly: true };
    case "custom_text":
      return { placeholder: "" };
    case "goals":
      return {
        placeholder:
          "Outline learning goals and focus areas for the upcoming term...",
      };
    default:
      return {};
  }
}
