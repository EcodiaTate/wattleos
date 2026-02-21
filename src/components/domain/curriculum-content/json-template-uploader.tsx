// src/components/domain/curriculum-content/json-template-uploader.tsx
//
// ============================================================
// WattleOS V2 - Module 14: JSON Template Uploader
// ============================================================
// Client component that handles:
// 1. File selection (drag-and-drop or click)
// 2. JSON parsing and schema validation
// 3. Preview of template metadata and node count
// 4. Import via importJsonTemplate server action
//
// WHY client: File reading, drag-and-drop, real-time validation
// feedback, and progress states require browser APIs.
// ============================================================

"use client";

import {
  importJsonTemplate,
  type JsonTemplateImport,
} from "@/lib/actions/curriculum-content";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

// ============================================================
// Types
// ============================================================

interface ValidationError {
  field: string;
  message: string;
}

interface ImportState {
  status: "idle" | "validating" | "preview" | "importing" | "success" | "error";
  template: JsonTemplateImport | null;
  nodeCount: number;
  crossMappingCount: number;
  validationErrors: ValidationError[];
  importResult: {
    template_id: string;
    nodes_created: number;
    cross_mappings_created: number;
    cross_mappings_skipped: number;
  } | null;
  errorMessage: string | null;
}

// ============================================================
// Component
// ============================================================

export function JsonTemplateUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [state, setState] = useState<ImportState>({
    status: "idle",
    template: null,
    nodeCount: 0,
    crossMappingCount: 0,
    validationErrors: [],
    importResult: null,
    errorMessage: null,
  });

  // ── File Reading ────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".json")) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: "Please upload a .json file.",
      }));
      return;
    }

    setState((s) => ({ ...s, status: "validating" }));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as JsonTemplateImport;
        const { errors, nodeCount, crossMappingCount } = validateTemplate(parsed);

        if (errors.length > 0) {
          setState({
            status: "error",
            template: null,
            nodeCount: 0,
            crossMappingCount: 0,
            validationErrors: errors,
            importResult: null,
            errorMessage: null,
          });
        } else {
          setState({
            status: "preview",
            template: parsed,
            nodeCount,
            crossMappingCount,
            validationErrors: [],
            importResult: null,
            errorMessage: null,
          });
        }
      } catch {
        setState({
          status: "error",
          template: null,
          nodeCount: 0,
          crossMappingCount: 0,
          validationErrors: [],
          importResult: null,
          errorMessage: "Invalid JSON. Please check the file format.",
        });
      }
    };
    reader.readAsText(file);
  }, []);

  // ── Drag and Drop ──────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Import ─────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!state.template) return;

    setState((s) => ({ ...s, status: "importing" }));

    const result = await importJsonTemplate(state.template);

    if (result.error) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: result.error?.message ?? "Import failed.",
      }));
    } else if (result.data) {
      setState((s) => ({
        ...s,
        status: "success",
        importResult: result.data,
      }));
      // Refresh the page data after a short delay
      setTimeout(() => router.refresh(), 1000);
    }
  }, [state.template, router]);

  // ── Reset ──────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setState({
      status: "idle",
      template: null,
      nodeCount: 0,
      crossMappingCount: 0,
      validationErrors: [],
      importResult: null,
      errorMessage: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {(state.status === "idle" || state.status === "validating") && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors
            ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
            ${state.status === "validating" ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <div className="text-3xl mb-2">
            {state.status === "validating" ? "⏳" : "📄"}
          </div>
          <p className="text-sm font-medium">
            {state.status === "validating"
              ? "Validating..."
              : "Drop a JSON template file here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse
          </p>
        </div>
      )}

      {/* Validation Errors */}
      {state.status === "error" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
          {state.errorMessage && (
            <p className="text-sm font-medium text-destructive">
              {state.errorMessage}
            </p>
          )}

          {state.validationErrors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">
                Validation errors:
              </p>
              <ul className="space-y-0.5">
                {state.validationErrors.map((err, i) => (
                  <li key={i} className="text-xs text-destructive">
                    <code className="font-mono">{err.field}</code>:{" "}
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleReset}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Try another file
          </button>
        </div>
      )}

      {/* Preview */}
      {state.status === "preview" && state.template && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <h3 className="text-sm font-medium">Template Preview</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PreviewField label="Name" value={state.template.name} />
              <PreviewField
                label="Framework"
                value={state.template.framework}
              />
              <PreviewField
                label="Age Range"
                value={state.template.age_range}
              />
              <PreviewField
                label="Version"
                value={state.template.version}
              />
              <PreviewField
                label="Country"
                value={state.template.country ?? "AU"}
              />
              <PreviewField
                label="State"
                value={state.template.state ?? "National"}
              />
              <PreviewField
                label="Compliance"
                value={
                  state.template.is_compliance_framework ? "Yes" : "No"
                }
              />
              <PreviewField label="Slug" value={state.template.slug} />
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {state.nodeCount}
                </span>{" "}
                curriculum nodes
              </span>
              {state.crossMappingCount > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {state.crossMappingCount}
                  </span>{" "}
                  cross-mappings
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                           bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                Import Template
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-md text-sm font-medium border border-border
                           text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Importing */}
      {state.status === "importing" && (
        <div className="rounded-lg border border-border p-8 text-center">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm font-medium">Importing template...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Creating nodes and cross-mappings. This may take a moment for large
            templates.
          </p>
        </div>
      )}

      {/* Success */}
      {state.status === "success" && state.importResult && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Template imported successfully
            </h3>
          </div>

          <div className="flex gap-4 text-xs text-emerald-700 dark:text-emerald-400">
            <span>
              {state.importResult.nodes_created} nodes created
            </span>
            <span>
              {state.importResult.cross_mappings_created} cross-mappings created
            </span>
            {state.importResult.cross_mappings_skipped > 0 && (
              <span>
                {state.importResult.cross_mappings_skipped} cross-mappings
                skipped (targets not found)
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <a
              href={`/pedagogy/content-library/template/${state.importResult.template_id}`}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View Template →
            </a>
            <button
              onClick={handleReset}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium truncate">{value}</dd>
    </div>
  );
}

// ============================================================
// Validation
// ============================================================

function validateTemplate(data: JsonTemplateImport): {
  errors: ValidationError[];
  nodeCount: number;
  crossMappingCount: number;
} {
  const errors: ValidationError[] = [];
  let nodeCount = 0;
  let crossMappingCount = 0;

  // Required top-level fields
  if (!data.slug || typeof data.slug !== "string") {
    errors.push({ field: "slug", message: "Required string" });
  }
  if (!data.name || typeof data.name !== "string") {
    errors.push({ field: "name", message: "Required string" });
  }
  if (!data.framework || typeof data.framework !== "string") {
    errors.push({ field: "framework", message: "Required string" });
  }
  if (!data.age_range || typeof data.age_range !== "string") {
    errors.push({ field: "age_range", message: "Required string" });
  }
  if (!data.version || typeof data.version !== "string") {
    errors.push({ field: "version", message: "Required string" });
  }

  // Nodes array
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    errors.push({ field: "nodes", message: "Must be a non-empty array" });
  } else {
    // Recursively count nodes and cross-mappings
    const counts = countNodesRecursive(data.nodes, "nodes", errors);
    nodeCount = counts.nodes;
    crossMappingCount = counts.crossMappings;
  }

  return { errors, nodeCount, crossMappingCount };
}

function countNodesRecursive(
  nodes: JsonTemplateImport["nodes"],
  path: string,
  errors: ValidationError[],
): { nodes: number; crossMappings: number } {
  let count = 0;
  let cmCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodePath = `${path}[${i}]`;

    if (!node.title || typeof node.title !== "string") {
      errors.push({ field: `${nodePath}.title`, message: "Required string" });
    }
    if (!node.level || typeof node.level !== "string") {
      errors.push({ field: `${nodePath}.level`, message: "Required string" });
    }

    count++;

    if (Array.isArray(node.cross_mappings)) {
      cmCount += node.cross_mappings.length;
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      const childCounts = countNodesRecursive(
        node.children,
        `${nodePath}.children`,
        errors,
      );
      count += childCounts.nodes;
      cmCount += childCounts.crossMappings;
    }
  }

  return { nodes: count, crossMappings: cmCount };
}
