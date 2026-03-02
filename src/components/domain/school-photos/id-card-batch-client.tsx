"use client";

import React, { useState, useMemo, useCallback, useTransition } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { getIdCardPersonData } from "@/lib/actions/school-photos";
import type { IdCardTemplate, IdCardPersonData } from "@/types/domain";
import { IdCardPreview } from "./id-card-preview";

// ============================================================
// ID Card Batch Client (Module R)
// ============================================================
// Three-step wizard for batch ID card generation:
// 1. Select template
// 2. Select people (with class filter)
// 3. Generate and download PDF
// ============================================================

interface ClassEntry {
  id: string;
  name: string;
}

interface IdCardBatchClientProps {
  templates: IdCardTemplate[];
  classes: ClassEntry[];
}

// Sample person for template preview in step 1
const SAMPLE_PERSON: IdCardPersonData = {
  id: "00000000-0000-0000-0000-000000000000",
  first_name: "Emma",
  last_name: "Johnson",
  preferred_name: null,
  photo_url: null,
  class_name: "Jacaranda Room",
  position: "Lead Educator",
  person_type: "student",
};

type WizardStep = 1 | 2 | 3;

export function IdCardBatchClient({
  templates,
  classes,
}: IdCardBatchClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(
    new Set(),
  );
  const [classFilter, setClassFilter] = useState<string>("");
  const [selectAll, setSelectAll] = useState(false);

  // People data fetched in step 3
  const [generatedData, setGeneratedData] = useState<{
    template: IdCardTemplate;
    people: IdCardPersonData[];
  } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dummy people roster for step 2 selection
  // In production, this would be loaded from a prop or fetched
  const [peopleRoster, setPeopleRoster] = useState<
    Array<{
      id: string;
      name: string;
      class_name: string | null;
      photo_url: string | null;
    }>
  >([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const filteredPeople = useMemo(() => {
    if (!classFilter) return peopleRoster;
    return peopleRoster.filter((p) => p.class_name === classFilter);
  }, [peopleRoster, classFilter]);

  const loadRoster = useCallback(async () => {
    if (rosterLoaded || !selectedTemplate) return;

    setError(null);
    startTransition(async () => {
      try {
        // Fetch people using getIdCardPersonData with a dummy call
        // We actually use the listStudentPhotos/listStaffPhotos for the roster
        // but since we have class-based filtering we load from the action
        const { listStudentPhotos, listStaffPhotos } = await import(
          "@/lib/actions/school-photos"
        );

        if (selectedTemplate.person_type === "student") {
          const result = await listStudentPhotos({
            page: 1,
            per_page: 100,
            search: null,
            has_photo: null,
            session_id: null,
            person_type: null,
            class_id: null,
          });
          if (result.error) {
            setError(result.error.message);
            return;
          }
          setPeopleRoster(
            (result.data?.students ?? []).map((s) => ({
              id: s.id,
              name: `${s.preferred_name || s.first_name} ${s.last_name}`,
              class_name: s.class_name,
              photo_url: s.photo_url,
            })),
          );
        } else {
          const result = await listStaffPhotos({
            page: 1,
            per_page: 100,
            search: null,
            has_photo: null,
            session_id: null,
            person_type: null,
            class_id: null,
          });
          if (result.error) {
            setError(result.error.message);
            return;
          }
          setPeopleRoster(
            (result.data?.staff ?? []).map((s) => ({
              id: s.id,
              name: `${s.first_name} ${s.last_name}`,
              class_name: s.role_name,
              photo_url: s.avatar_url,
            })),
          );
        }
        setRosterLoaded(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load roster",
        );
      }
    });
  }, [rosterLoaded, selectedTemplate]);

  const togglePerson = useCallback(
    (personId: string) => {
      setSelectedPersonIds((prev) => {
        const next = new Set(prev);
        if (next.has(personId)) {
          next.delete(personId);
        } else {
          next.add(personId);
        }
        return next;
      });
      haptics.impact("light");
    },
    [haptics],
  );

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedPersonIds(new Set());
    } else {
      setSelectedPersonIds(new Set(filteredPeople.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
    haptics.impact("light");
  }, [selectAll, filteredPeople, haptics]);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateId || selectedPersonIds.size === 0) return;

    setError(null);
    setIsGenerating(true);

    try {
      // Step 1: Fetch person data from server
      const result = await getIdCardPersonData({
        template_id: selectedTemplateId,
        person_ids: Array.from(selectedPersonIds),
        year: new Date().getFullYear().toString(),
      });

      if (result.error) {
        setError(result.error.message);
        setIsGenerating(false);
        haptics.error();
        return;
      }

      setGeneratedData(result.data!);

      // Step 2: Dynamically import the PDF renderer and generate the PDF
      const [{ pdf }, { IdCardDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/integrations/pdf/id-card-renderer"),
      ]);

      const doc = React.createElement(IdCardDocument, {
        people: result.data!.people,
        config: result.data!.template.template_config,
        schoolName: "School Name", // This would come from tenant config
        schoolLogoUrl: null,
        year: new Date().getFullYear().toString(),
        qrDataUris: new Map(),
      }) as unknown as React.ReactElement<DocumentProps>;

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      haptics.impact("heavy");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate ID cards",
      );
      haptics.error();
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplateId, selectedPersonIds, haptics]);

  const goToStep = useCallback(
    (nextStep: WizardStep) => {
      setStep(nextStep);
      haptics.impact("light");

      if (nextStep === 2 && !rosterLoaded) {
        loadRoster();
      }
    },
    [haptics, rosterLoaded, loadRoster],
  );

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background:
                  step >= s
                    ? "var(--primary)"
                    : "var(--muted)",
                color:
                  step >= s
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
              }}
            >
              {s}
            </div>
            <span
              className="text-xs font-medium"
              style={{
                color:
                  step === s
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
              }}
            >
              {s === 1 ? "Template" : s === 2 ? "People" : "Generate"}
            </span>
            {s < 3 && (
              <div
                className="mx-1 h-px w-8"
                style={{ background: "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Select template */}
      {step === 1 && (
        <div className="space-y-4">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Select a card template
          </p>

          {templates.length === 0 && (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No templates created yet. Create a template first.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setRosterLoaded(false);
                  setPeopleRoster([]);
                  setSelectedPersonIds(new Set());
                  haptics.impact("light");
                }}
                className="card-interactive rounded-[var(--radius-lg)] border p-4 text-left"
                style={{
                  borderColor:
                    selectedTemplateId === template.id
                      ? "var(--primary)"
                      : "var(--border)",
                  background:
                    selectedTemplateId === template.id
                      ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                      : "var(--card)",
                }}
              >
                {/* Mini preview */}
                <div className="mb-3 flex justify-center">
                  <div style={{ transform: "scale(0.55)", transformOrigin: "top center" }}>
                    <IdCardPreview
                      config={template.template_config}
                      person={{
                        ...SAMPLE_PERSON,
                        person_type: template.person_type,
                      }}
                      schoolName="School"
                      schoolLogoUrl={null}
                      year={new Date().getFullYear().toString()}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {template.name}
                    </p>
                    <p
                      className="text-xs capitalize"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {template.person_type} ·{" "}
                      {template.template_config.card_orientation}
                    </p>
                  </div>
                  {template.is_default && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--photo-matched-bg)",
                        color: "var(--photo-matched)",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!selectedTemplateId}
              onClick={() => goToStep(2)}
              className="active-push touch-target rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Next: Select People
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select people */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Select people for ID cards
            </p>
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {selectedPersonIds.size} selected
            </span>
          </div>

          {/* Class filter + select all */}
          <div className="flex items-center gap-3">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSelectAll(false);
              }}
              className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSelectAll}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-medium"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              {selectAll ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Loading state */}
          {isPending && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Loading roster...
            </div>
          )}

          {/* People list */}
          {!isPending && (
            <div className="scroll-native max-h-[400px] space-y-1.5 overflow-y-auto">
              {filteredPeople.map((person) => {
                const isSelected = selectedPersonIds.has(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-all"
                    style={{
                      borderColor: isSelected
                        ? "var(--primary)"
                        : "var(--border)",
                      background: isSelected
                        ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                        : "var(--card)",
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border"
                      style={{
                        borderColor: isSelected
                          ? "var(--primary)"
                          : "var(--border)",
                        background: isSelected
                          ? "var(--primary)"
                          : "transparent",
                      }}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3"
                          style={{ color: "var(--primary-foreground)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Photo */}
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border"
                      style={{
                        background: person.photo_url
                          ? "transparent"
                          : "var(--muted)",
                      }}
                    >
                      {person.photo_url ? (
                        <img
                          src={person.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {person.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>

                    {/* Name + class */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {person.name}
                      </p>
                      {person.class_name && (
                        <p
                          className="truncate text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {person.class_name}
                        </p>
                      )}
                    </div>

                    {/* Photo indicator */}
                    {!person.photo_url && (
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: "var(--photo-no-photo-bg)",
                          color: "var(--photo-no-photo)",
                        }}
                      >
                        No photo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-semibold"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={selectedPersonIds.size === 0}
              onClick={() => goToStep(3)}
              className="active-push touch-target rounded-[var(--radius-md)] px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Next: Generate ({selectedPersonIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <div className="space-y-4">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Generate ID Cards
          </p>

          {/* Summary */}
          <div
            className="rounded-[var(--radius-lg)] border border-border p-4"
            style={{ background: "var(--card)" }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>
                  Template
                </span>
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {selectedTemplate?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>People</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {selectedPersonIds.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>
                  Layout
                </span>
                <span
                  className="font-medium capitalize"
                  style={{ color: "var(--foreground)" }}
                >
                  {selectedTemplate?.template_config.card_orientation ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>Year</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {/* Generate button */}
          {!pdfBlobUrl && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating PDF...
                </span>
              ) : (
                `Generate ${selectedPersonIds.size} ID Card${selectedPersonIds.size !== 1 ? "s" : ""}`
              )}
            </button>
          )}

          {/* Download button */}
          {pdfBlobUrl && (
            <div className="space-y-3">
              <div
                className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] py-3 text-sm font-medium"
                style={{ color: "var(--photo-matched)" }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                PDF generated successfully
              </div>
              <a
                href={pdfBlobUrl}
                download={`ID_Cards_${new Date().getFullYear()}.pdf`}
                className="active-push touch-target flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Download PDF
              </a>

              {/* Regenerate button */}
              <button
                type="button"
                onClick={() => {
                  if (pdfBlobUrl) {
                    URL.revokeObjectURL(pdfBlobUrl);
                  }
                  setPdfBlobUrl(null);
                  setGeneratedData(null);
                }}
                className="active-push touch-target w-full rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium"
                style={{
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                Generate Again
              </button>
            </div>
          )}

          {/* Back button */}
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={() => {
                if (pdfBlobUrl) {
                  URL.revokeObjectURL(pdfBlobUrl);
                  setPdfBlobUrl(null);
                }
                setGeneratedData(null);
                goToStep(2);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-semibold"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
