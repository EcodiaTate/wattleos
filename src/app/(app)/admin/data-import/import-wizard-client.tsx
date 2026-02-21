// src/app/(app)/admin/data-import/import-wizard-client.tsx
//
// ============================================================
// WattleOS V2 - Import Wizard Client Component
// ============================================================
// WHY: Updated to use the WattleOS V2 configurable styling system.
// Uses semantic tokens for primary/secondary/muted states and
// respects density/font-scale data attributes.
// ============================================================

"use client";

import { useCallback, useRef, useState } from "react";

import {
  executeImport,
  rollbackImport,
  validateImportData,
} from "@/lib/data-import/actions";
import {
  generateCSVTemplate,
  parseCSV,
  suggestColumnMapping,
} from "@/lib/data-import/csv-parser";
import {
  IMPORT_FIELD_REGISTRY,
  type ColumnMapping,
  type ImportJob,
  type ImportType,
  type ImportWizardStep,
  type MappingSuggestion,
  type ParsedCSV,
  type ValidationResult,
} from "@/lib/data-import/types";

import { MassInviteClient } from "./mass-invite-client";

// ============================================================
// Import Type Metadata
// ============================================================

const IMPORT_TYPE_INFO: Record<
  ImportType,
  { label: string; description: string; icon: string; order_hint: string }
> = {
  students: {
    label: "Students",
    description:
      "Student names, dates of birth, class assignments, and enrollment status.",
    icon: "👩‍🎓",
    order_hint: "Import this first - other imports reference students by name.",
  },
  guardians: {
    label: "Guardians / Parents",
    description:
      "Link parents and carers to their children. Requires students to exist first.",
    icon: "👨‍👩+👧",
    order_hint:
      "Import after students. Guardians are matched to students by name.",
  },
  emergency_contacts: {
    label: "Emergency Contacts",
    description:
      "Emergency contact details for each student. Separate from guardians.",
    icon: "🚨",
    order_hint: "Import after students.",
  },
  medical_conditions: {
    label: "Medical Conditions",
    description:
      "Allergies, medical conditions, action plans, and medication details.",
    icon: "🏥",
    order_hint: "Import after students.",
  },
  staff: {
    icon: "🧑‍🏫",
    label: "Staff",
    description:
      "Import staff members with their roles. Sends invitation emails.",
    order_hint: "Import any time - staff records are independent.",
  },
  attendance: {
    icon: "📋",
    label: "Attendance History",
    description:
      "Import historical attendance records. Uses upsert - safe to re-import.",
    order_hint:
      "Import after students. Existing records for the same date will be updated.",
  },
};

const IMPORT_TYPE_ORDER: ImportType[] = [
  "students",
  "guardians",
  "emergency_contacts",
  "medical_conditions",
  "staff",
  "attendance",
];

// ============================================================
// Main Component
// ============================================================

interface ImportWizardClientProps {
  importHistory: ImportJob[];
  canInvite?: boolean;
}

export function ImportWizardClient({
  importHistory,
  canInvite,
}: ImportWizardClientProps) {
  const [activeTab, setActiveTab] = useState<"import" | "invite">("import");

  // Wizard state
  const [step, setStep] = useState<ImportWizardStep>("select_type");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportJob[]>(importHistory);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetWizard = useCallback(() => {
    setStep("select_type");
    setImportType(null);
    setFileName(null);
    setParsedCSV(null);
    setColumnMapping({});
    setSuggestions([]);
    setValidationResult(null);
    setImportJob(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  const handleSelectType = useCallback((type: ImportType) => {
    setImportType(type);
    setStep("upload");
    setError(null);
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.match(/\.(csv|tsv|txt)$/)) {
        setError("Please upload a CSV file (.csv, .tsv, or .txt)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large. Maximum size is 10 MB.");
        return;
      }

      if (!importType) {
        setError("Please select an import type first.");
        return;
      }

      setFileName(file.name);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseCSV(text);

        if (result.error || !result.data) {
          setError(result.error ?? "Failed to parse CSV");
          return;
        }

        setParsedCSV(result.data);
        const fields = IMPORT_FIELD_REGISTRY[importType];
        const mappingSuggestions = suggestColumnMapping(
          result.data.headers,
          fields,
        );
        setSuggestions(mappingSuggestions);

        const autoMapping: ColumnMapping = {};
        for (const suggestion of mappingSuggestions) {
          if (suggestion.confidence > 0.7) {
            autoMapping[suggestion.csv_header] = suggestion.wattle_field;
          }
        }
        setColumnMapping(autoMapping);
        setStep("map_columns");
      };

      reader.readAsText(file);
    },
    [importType],
  );

  const handleDownloadTemplate = useCallback(() => {
    if (!importType) return;
    const fields = IMPORT_FIELD_REGISTRY[importType];
    const csv = generateCSVTemplate(fields);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wattleos_${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [importType]);

  const handleMappingChange = useCallback(
    (csvHeader: string, wattleField: string) => {
      setColumnMapping((prev) => {
        const next = { ...prev };
        if (wattleField === "") {
          delete next[csvHeader];
        } else {
          for (const [key, val] of Object.entries(next)) {
            if (val === wattleField) delete next[key];
          }
          next[csvHeader] = wattleField;
        }
        return next;
      });
    },
    [],
  );

  const handleValidate = useCallback(async () => {
    if (!importType || !parsedCSV) return;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await validateImportData({
        import_type: importType,
        parsed_csv: parsedCSV,
        column_mapping: columnMapping,
      });

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Validation failed");
        return;
      }

      setValidationResult(result.data);
      setStep("preview");
    } catch {
      setError("An unexpected error occurred during validation.");
    } finally {
      setIsProcessing(false);
    }
  }, [importType, parsedCSV, columnMapping]);

  const handleExecuteImport = useCallback(async () => {
    if (!importType || !validationResult) return;
    setIsProcessing(true);
    setError(null);
    setStep("importing");

    try {
      const result = await executeImport({
        import_type: importType,
        file_name: fileName ?? "unknown.csv",
        column_mapping: columnMapping,
        validated_rows: validationResult.rows,
        metadata: { source_platform: "csv_upload" },
        skip_duplicates: true,
      });

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Import failed");
        setStep("preview");
        return;
      }

      setImportJob(result.data);
      setHistory((prev) => [result.data!, ...prev].slice(0, 20));
      setStep("results");
    } catch {
      setError("An unexpected error occurred during import.");
      setStep("preview");
    } finally {
      setIsProcessing(false);
    }
  }, [importType, fileName, columnMapping, validationResult]);

  const handleRollback = useCallback(async () => {
    if (!importJob) return;
    const confirmed = window.confirm(
      `This will undo the import and remove all ${importJob.imported_count} imported records. Continue?`,
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const result = await rollbackImport(importJob.id);
      if (result.error) {
        setError(result.error.message);
      } else {
        setImportJob((prev) =>
          prev ? { ...prev, status: "rolled_back" } : null,
        );
        setHistory((prev) =>
          prev.map((j) =>
            j.id === importJob.id ? { ...j, status: "rolled_back" } : j,
          ),
        );
      }
    } catch {
      setError("Failed to rollback import.");
    } finally {
      setIsProcessing(false);
    }
  }, [importJob]);

  // ---- Tab UI wrapper ----
  const tabHeader = canInvite ? (
    <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => setActiveTab("import")}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
          activeTab === "import"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        CSV Import
      </button>
      <button
        onClick={() => setActiveTab("invite")}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
          activeTab === "invite"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Mass Invite
      </button>
    </div>
  ) : null;

  if (canInvite && activeTab === "invite") {
    return (
      <div className="animate-fade-in">
        {tabHeader}
        <MassInviteClient />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {tabHeader}

      <StepIndicator currentStep={step} />

      {error && (
        <div className="mb-6 animate-slide-down rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-medium">Error:</span> {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === "select_type" && (
        <SelectTypeStep
          onSelect={handleSelectType}
          history={history}
          onRollback={async (jobId) => {
            const result = await rollbackImport(jobId);
            if (result.data) {
              setHistory((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, status: "rolled_back" } : j,
                ),
              );
            }
          }}
        />
      )}

      {step === "upload" && importType && (
        <UploadStep
          importType={importType}
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          onDownloadTemplate={handleDownloadTemplate}
          onBack={() => setStep("select_type")}
        />
      )}

      {step === "map_columns" && importType && parsedCSV && (
        <MapColumnsStep
          importType={importType}
          parsedCSV={parsedCSV}
          columnMapping={columnMapping}
          suggestions={suggestions}
          onMappingChange={handleMappingChange}
          onValidate={handleValidate}
          isProcessing={isProcessing}
          onBack={() => {
            setStep("upload");
            setParsedCSV(null);
            setFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      )}

      {step === "preview" && validationResult && (
        <PreviewStep
          validationResult={validationResult}
          importType={importType!}
          onExecute={handleExecuteImport}
          isProcessing={isProcessing}
          onBack={() => setStep("map_columns")}
        />
      )}

      {step === "importing" && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-lg font-medium text-foreground">
            Importing records...
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This may take a moment for large files.
          </p>
        </div>
      )}

      {step === "results" && importJob && (
        <ResultsStep
          importJob={importJob}
          onRollback={handleRollback}
          onNewImport={resetWizard}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

// ============================================================
// Step Indicator Component
// ============================================================

function StepIndicator({ currentStep }: { currentStep: ImportWizardStep }) {
  const steps: { key: ImportWizardStep; label: string }[] = [
    { key: "select_type", label: "Select Type" },
    { key: "upload", label: "Upload" },
    { key: "map_columns", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "results", label: "Results" },
  ];

  const currentIndex = steps.findIndex(
    (s) =>
      s.key === currentStep ||
      (currentStep === "importing" && s.key === "results"),
  );

  return (
    <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        return (
          <div key={s.key} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary-100 text-primary-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 ${isCompleted ? "bg-primary-200" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 1: Select Type
// ============================================================

function SelectTypeStep({
  onSelect,
  history,
  onRollback,
}: {
  onSelect: (type: ImportType) => void;
  history: ImportJob[];
  onRollback: (jobId: string) => Promise<void>;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          What would you like to import?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import data from any CSV file. We support major SIS exports and custom
          spreadsheets.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {IMPORT_TYPE_ORDER.map((type) => {
          const info = IMPORT_TYPE_INFO[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="card-interactive flex items-start gap-4 rounded-lg border bg-card p-4 text-left"
            >
              <span className="text-2xl">{info.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{info.label}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {info.description}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-primary-600">
                  {info.order_hint}
                </div>
              </div>
              <span className="text-muted-foreground/30">→</span>
            </button>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Recent Imports
          </h3>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      File
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Rows
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 capitalize font-medium">
                        {job.import_type.replaceAll("_", " ")}
                      </td>
                      <td className="max-w-[150px] truncate px-4 py-3 text-muted-foreground">
                        {job.file_name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {job.imported_count}/{job.total_rows}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {["completed", "completed_with_errors"].includes(
                          job.status,
                        ) && (
                          <button
                            onClick={() => onRollback(job.id)}
                            className="text-xs font-medium text-destructive hover:underline"
                          >
                            Undo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Step 2: Upload
// ============================================================

function UploadStep({
  importType,
  fileInputRef,
  onFileUpload,
  onDownloadTemplate,
  onBack,
}: {
  importType: ImportType;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onBack: () => void;
}) {
  const info = IMPORT_TYPE_INFO[importType];
  const fields = IMPORT_FIELD_REGISTRY[importType];
  const requiredFields = fields.filter((f) => f.required);

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back
      </button>

      <h2 className="text-xl font-semibold">Upload {info.label} CSV</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a CSV file. You&#39;ll map columns in the next step.
      </p>

      <div
        className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-card/50 p-12 transition-all hover:border-primary hover:bg-primary-50/20 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && fileInputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
          }
        }}
      >
        <div className="text-5xl mb-4">📄</div>
        <p className="font-semibold text-foreground">
          Drag and drop CSV here, or click to browse
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports .csv, .tsv up to 10 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={onFileUpload}
          className="hidden"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Download Template</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Start from our pre-formatted template.
          </p>
          <button
            onClick={onDownloadTemplate}
            className="mt-4 w-full rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Download {info.label} Template
          </button>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Required Fields</h3>
          <ul className="mt-3 space-y-2">
            {requiredFields.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-medium text-foreground">{f.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  - e.g. {f.example}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: Map Columns
// ============================================================

function MapColumnsStep({
  importType,
  parsedCSV,
  columnMapping,
  suggestions,
  onMappingChange,
  onValidate,
  isProcessing,
  onBack,
}: {
  importType: ImportType;
  parsedCSV: ParsedCSV;
  columnMapping: ColumnMapping;
  suggestions: MappingSuggestion[];
  onMappingChange: (csvHeader: string, wattleField: string) => void;
  onValidate: () => void;
  isProcessing: boolean;
  onBack: () => void;
}) {
  const fields = IMPORT_FIELD_REGISTRY[importType];
  const requiredFieldKeys = fields.filter((f) => f.required).map((f) => f.key);
  const mappedWattleFields = new Set(Object.values(columnMapping));
  const missingRequired = requiredFieldKeys.filter(
    (k) => !mappedWattleFields.has(k),
  );

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>

      <h2 className="text-xl font-semibold">Map Your Columns</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Match CSV columns to WattleOS fields.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="sticky left-0 bg-muted/80 backdrop-blur-sm px-3 py-2 text-left font-semibold text-muted-foreground">
                  Row
                </th>
                {parsedCSV.headers.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {parsedCSV.rows.slice(0, 3).map((row, i) => (
                <tr key={i}>
                  <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground font-medium border-r">
                    {i + 1}
                  </td>
                  {parsedCSV.headers.map((h) => (
                    <td
                      key={h}
                      className="max-w-[150px] truncate whitespace-nowrap px-3 py-2 text-foreground/80 italic"
                    >
                      {row[h] || " - "}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {parsedCSV.headers.map((header) => {
          const currentMapping = columnMapping[header] ?? "";
          const suggestion = suggestions.find((s) => s.csv_header === header);

          return (
            <div
              key={header}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 animate-fade-in"
            >
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">
                {header}
                {parsedCSV.rows[0]?.[header] && (
                  <span className="block mt-0.5 text-[10px] font-normal text-muted-foreground">
                    Sample: &quot;{parsedCSV.rows[0][header]}&quot;
                  </span>
                )}
              </div>
              <div className="text-muted-foreground/40">→</div>
              <div className="relative group">
                <select
                  value={currentMapping}
                  onChange={(e) => onMappingChange(header, e.target.value)}
                  className={`w-full h-11 rounded-lg border px-3 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-primary/50 ${
                    currentMapping
                      ? "border-primary bg-primary-50/30 text-foreground font-medium"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <option value=""> - Skip - </option>
                  {fields.map((field) => {
                    const isMappedElsewhere =
                      mappedWattleFields.has(field.key) &&
                      columnMapping[header] !== field.key;
                    return (
                      <option
                        key={field.key}
                        value={field.key}
                        disabled={isMappedElsewhere}
                      >
                        {field.label} {field.required ? " *" : ""}
                      </option>
                    );
                  })}
                </select>
                {suggestion &&
                  !currentMapping &&
                  suggestion.confidence > 0.6 && (
                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
                      {Math.round(suggestion.confidence * 100)}% Match
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {missingRequired.length > 0 && (
        <div className="mt-6 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning-foreground">
          <span className="font-semibold">Missing:</span>{" "}
          {missingRequired
            .map((k) => fields.find((f) => f.key === k)?.label)
            .join(", ")}
        </div>
      )}

      <div className="mt-8 pt-6 border-t flex items-center gap-4">
        <button
          onClick={onValidate}
          disabled={missingRequired.length > 0 || isProcessing}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-primary transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale"
        >
          {isProcessing ? "Validating..." : "Validate & Preview"}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Checking {parsedCSV.raw_row_count} rows
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Step 4: Preview
// ============================================================

function PreviewStep({
  validationResult,
  importType,
  onExecute,
  isProcessing,
  onBack,
}: {
  validationResult: ValidationResult;
  importType: ImportType;
  onExecute: () => void;
  isProcessing: boolean;
  onBack: () => void;
}) {
  const { summary, rows } = validationResult;
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const fields = IMPORT_FIELD_REGISTRY[importType];
  const displayRows = showOnlyErrors
    ? rows.filter((r) => !r.is_valid || r.warnings.length > 0)
    : rows;

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>

      <h2 className="text-xl font-semibold">Preview Import</h2>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={summary.total_rows} color="stone" />
        <SummaryCard label="Valid" value={summary.valid_rows} color="green" />
        <SummaryCard label="Errors" value={summary.error_rows} color="red" />
        <SummaryCard
          label="Dups"
          value={summary.duplicate_rows}
          color="amber"
        />
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => setShowOnlyErrors(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            Show only issues
          </label>
        </div>

        <div className="max-h-96 overflow-auto rounded-lg border bg-card shadow-inner">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm border-b z-20">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Row
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Status
                </th>
                {fields.slice(0, 4).map((f) => (
                  <th
                    key={f.key}
                    className="px-3 py-2 text-left font-semibold text-muted-foreground"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayRows.slice(0, 100).map((row) => (
                <tr
                  key={row.row_number}
                  className={
                    !row.is_valid
                      ? "bg-destructive/5"
                      : row.is_duplicate
                        ? "bg-warning/5"
                        : ""
                  }
                >
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    {row.row_number}
                  </td>
                  <td className="px-3 py-2">
                    {row.is_valid ? (
                      <span
                        className={
                          row.is_duplicate
                            ? "text-warning font-bold"
                            : "text-success font-bold"
                        }
                      >
                        {row.is_duplicate ? "DUP" : "OK"}
                      </span>
                    ) : (
                      <span className="text-destructive font-bold">ERR</span>
                    )}
                  </td>
                  {fields.slice(0, 4).map((f) => (
                    <td
                      key={f.key}
                      className="max-w-[120px] truncate px-3 py-2 text-foreground/80"
                    >
                      {row.mapped_data[f.key] || " - "}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {row.errors.concat(row.warnings).map((m, i) => (
                      <span
                        key={i}
                        className="block text-[10px] leading-tight mb-0.5 last:mb-0"
                      >
                        {m.message}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={onExecute}
          disabled={summary.valid_rows === 0 || isProcessing}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-primary transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? "Importing..." : `Import ${summary.valid_rows} Rows`}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 5: Results
// ============================================================

function ResultsStep({
  importJob,
  onRollback,
  onNewImport,
  isProcessing,
}: {
  importJob: ImportJob;
  onRollback: () => void;
  onNewImport: () => void;
  isProcessing: boolean;
}) {
  const isSuccess =
    importJob.status === "completed" ||
    importJob.status === "completed_with_errors";

  return (
    <div className="animate-scale-in text-center py-8">
      <div className="text-6xl mb-4">
        {importJob.status === "completed"
          ? "🎉"
          : importJob.status === "rolled_back"
            ? "↩️"
            : "⚠️"}
      </div>
      <h2 className="text-2xl font-bold mb-8">
        {importJob.status === "completed"
          ? "Import Successful!"
          : "Import Finished"}
      </h2>

      <div className="mx-auto max-w-sm grid grid-cols-3 gap-3">
        <SummaryCard
          label="Imported"
          value={importJob.imported_count}
          color="green"
        />
        <SummaryCard
          label="Skipped"
          value={importJob.skipped_count}
          color="amber"
        />
        <SummaryCard label="Errors" value={importJob.error_count} color="red" />
      </div>

      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onNewImport}
          className="w-full sm:w-auto rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-primary transition-all hover:scale-105"
        >
          Start Another Import
        </button>
        {isSuccess && (
          <button
            onClick={onRollback}
            disabled={isProcessing}
            className="w-full sm:w-auto rounded-lg border border-destructive/30 px-8 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5"
          >
            {isProcessing ? "Rolling back..." : "Undo Import"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Shared UI Components
// ============================================================

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "stone" | "green" | "red" | "amber";
}) {
  const colorClasses = {
    stone: "bg-muted text-muted-foreground border-border",
    green: "bg-success/10 text-success-foreground border-success/20",
    red: "bg-destructive/10 text-destructive-foreground border-destructive/20",
    amber: "bg-warning/10 text-warning-foreground border-warning/20",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-4 text-center ${colorClasses[color]} shadow-sm`}
    >
      <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-success/10 text-success",
    completed_with_errors: "bg-warning/10 text-warning",
    failed: "bg-destructive/10 text-destructive",
    rolled_back: "bg-muted text-muted-foreground",
    importing: "bg-primary/10 text-primary",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
