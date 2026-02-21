// src/components/domain/curriculum-content/node-enrichment-editor.tsx
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
  const [directAims, setDirectAims] = useState<string[]>(node.direct_aims ?? []);
  const [indirectAims, setIndirectAims] = useState<string[]>(node.indirect_aims ?? []);
  const [ageRange, setAgeRange] = useState(node.age_range ?? "");
  const [assessmentCriteria, setAssessmentCriteria] = useState(node.assessment_criteria ?? "");
  const [contentUrl, setContentUrl] = useState(node.content_url ?? "");

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
      if (result.error) setError(result.error.message);
      else {
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }, [node.id, materials, directAims, indirectAims, ageRange, assessmentCriteria, contentUrl]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-[var(--density-md)]">
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-[var(--density-button-padding-x)] h-[var(--density-button-height)] rounded-lg text-sm font-bold
                     border border-border bg-card hover:bg-muted transition-all shadow-sm"
        >
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit Enrichment
        </button>
        {success && <span className="text-sm font-bold text-success animate-fade-in">✓ Changes Saved</span>}
      </div>
    );
  }

  return (
    <div className="space-y-[var(--density-xl)] rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-md animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-border pb-[var(--density-md)]">
        <h3 className="text-lg font-bold text-foreground">Enrichment Editor</h3>
        <div className="flex items-center gap-[var(--density-sm)]">
          <button onClick={() => setIsEditing(false)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-sm font-bold border border-border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="px-4 py-1.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-primary/20 shadow-md">
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <TagField label="Materials" tags={materials} onTagsChange={setMaterials} inputValue={materialInput} onInputChange={setMaterialInput} placeholder="Add material..." />
      <TagField label="Direct Aims" tags={directAims} onTagsChange={setDirectAims} inputValue={directAimInput} onInputChange={setDirectAimInput} placeholder="Add aim..." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--density-lg)]">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Age Range</label>
          <input type="text" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g., 3-6" className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Reference URL</label>
          <input type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">Assessment Criteria</label>
        <textarea value={assessmentCriteria} onChange={(e) => setAssessmentCriteria(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none" />
      </div>
    </div>
  );
}

function TagField({ label, tags, onTagsChange, inputValue, onInputChange, placeholder }: any) {
  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) onTagsChange([...tags, inputValue.trim()]);
      onInputChange("");
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) onTagsChange(tags.slice(0, -1));
  };

  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-2 min-h-[42px] rounded-lg border border-input bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary transition-all">
        {tags.map((tag: string, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-secondary text-secondary-foreground border border-secondary/20">
            {tag}
            <button type="button" onClick={() => onTagsChange(tags.filter((_: any, idx: number) => idx !== i))} className="hover:text-destructive">×</button>
          </span>
        ))}
        <input type="text" value={inputValue} onChange={(e) => onInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={tags.length === 0 ? placeholder : ""} className="flex-1 min-w-[120px] h-6 bg-transparent text-sm outline-none" />
      </div>
    </div>
  );
}