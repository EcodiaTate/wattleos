// src/components/domain/curriculum-content/node-enrichment-editor.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Node Enrichment Editor
// ============================================================
// Client component that allows authorized users (curriculum
// managers, lead guides) to edit the Module 14 metadata fields
// on a curriculum node: materials, aims, prerequisites, and
// assessment criteria.
//
// WHY 'use client': Form state, tag input UX, and server action
// calls on submit require client-side interactivity.
// ============================================================

"use client";

import {
  updateNodeEnrichment,
  type EnhancedCurriculumNode,
  type UpdateNodeEnrichmentInput,
} from "@/lib/actions/curriculum-content";
import { useCallback, useState, useTransition } from "react";

interface NodeEnrichmentEditorProps {
  node: EnhancedCurriculumNode;
}

export function NodeEnrichmentEditor({ node }: NodeEnrichmentEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [materials, setMaterials] = useState<string[]>(node.materials ?? []);
  const [directAims, setDirectAims] = useState<string[]>(
    node.direct_aims ?? [],
  );
  const [indirectAims, setIndirectAims] = useState<string[]>(
    node.indirect_aims ?? [],
  );
  const [ageRange, setAgeRange] = useState(node.age_range ?? "");
  const [assessmentCriteria, setAssessmentCriteria] = useState(
    node.assessment_criteria ?? "",
  );
  const [contentUrl, setContentUrl] = useState(node.content_url ?? "");

  // Tag input states
  const [materialInput, setMaterialInput] = useState("");
  const [directAimInput, setDirectAimInput] = useState("");
  const [indirectAimInput, setIndirectAimInput] = useState("");

  const handleSave = useCallback(() => {
    setError(null);
    setSuccess(false);

    const input: UpdateNodeEnrichmentInput = {
      materials: materials.length > 0 ? materials : undefined,
      direct_aims: directAims.length > 0 ? directAims : undefined,
      indirect_aims: indirectAims.length > 0 ? indirectAims : undefined,
      age_range: ageRange || undefined,
      assessment_criteria: assessmentCriteria || undefined,
      content_url: contentUrl || undefined,
    };

    startTransition(async () => {
      const result = await updateNodeEnrichment(node.id, input);
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
        setIsEditing(false);
        // Clear success after 3s
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }, [
    node.id,
    materials,
    directAims,
    indirectAims,
    ageRange,
    assessmentCriteria,
    contentUrl,
  ]);

  const handleCancel = useCallback(() => {
    // Reset form to original values
    setMaterials(node.materials ?? []);
    setDirectAims(node.direct_aims ?? []);
    setIndirectAims(node.indirect_aims ?? []);
    setAgeRange(node.age_range ?? "");
    setAssessmentCriteria(node.assessment_criteria ?? "");
    setContentUrl(node.content_url ?? "");
    setError(null);
    setIsEditing(false);
  }, [node]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                     border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
          Edit Enrichment Data
        </button>
        {success && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Saved successfully
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Edit Enrichment Data</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md text-sm border border-border
                       hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground
                       hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Materials */}
      <TagField
        label="Materials"
        tags={materials}
        onTagsChange={setMaterials}
        inputValue={materialInput}
        onInputChange={setMaterialInput}
        placeholder="Add a material and press Enter..."
      />

      {/* Direct Aims */}
      <TagField
        label="Direct Aims"
        tags={directAims}
        onTagsChange={setDirectAims}
        inputValue={directAimInput}
        onInputChange={setDirectAimInput}
        placeholder="Add a direct aim and press Enter..."
      />

      {/* Indirect Aims */}
      <TagField
        label="Indirect Aims"
        tags={indirectAims}
        onTagsChange={setIndirectAims}
        inputValue={indirectAimInput}
        onInputChange={setIndirectAimInput}
        placeholder="Add an indirect aim and press Enter..."
      />

      {/* Age Range */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Age Range
        </label>
        <input
          type="text"
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          placeholder="e.g., 2.5-4, 3-6"
          className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2
                     focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Assessment Criteria (free text) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Assessment Criteria
        </label>
        <textarea
          value={assessmentCriteria}
          onChange={(e) => setAssessmentCriteria(e.target.value)}
          placeholder="Assessment criteria for this outcome (used for QCAA senior subjects)..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2
                     focus:ring-ring focus:ring-offset-2 resize-y"
        />
      </div>

      {/* Content URL */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Reference URL
        </label>
        <input
          type="url"
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="https://..."
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2
                     focus:ring-ring focus:ring-offset-2"
        />
      </div>
    </div>
  );
}

// ============================================================
// Tag Input Sub-component
// ============================================================

interface TagFieldProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  placeholder: string;
}

function TagField({
  label,
  tags,
  onTagsChange,
  inputValue,
  onInputChange,
  placeholder,
}: TagFieldProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onTagsChange([...tags, inputValue.trim()]);
      }
      onInputChange("");
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}
      </label>
      <div
        className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border border-input bg-background
                    px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs
                       bg-muted text-muted-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:text-destructive transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] h-6 bg-transparent text-sm outline-none
                     placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Press Enter to add, Backspace to remove last
      </p>
    </div>
  );
}
