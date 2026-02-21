// src/components/domain/sis/EnrollStudentForm.tsx
"use client";

import { enrollStudent } from "@/lib/actions/enrollments";
import { listStudents } from "@/lib/actions/students";
import { calculateAge, formatStudentName } from "@/lib/utils";
import type { Student } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface EnrollStudentFormProps {
  classId: string;
  className: string;
}

export function EnrollStudentForm({ classId, className }: EnrollStudentFormProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true); setHasSearched(true); setError(null);
    const result = await listStudents({ search: searchQuery.trim(), per_page: 10, enrollment_status: "active" });
    if (result.data) setSearchResults(result.data);
    setIsSearching(false);
  }, [searchQuery]);

  async function handleEnroll() {
    if (!selectedStudent) return;
    setIsEnrolling(true); setError(null);
    const result = await enrollStudent({ student_id: selectedStudent.id, class_id: classId, start_date: startDate });
    if (result.error) { setError(result.error.message); setIsEnrolling(false); return; }
    router.push(`/classes/${classId}`);
    router.refresh();
  }

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-[var(--density-card-padding)] animate-scale-in">
          <p className="text-sm font-bold text-destructive">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-black">1</span>
          Find Student
        </h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            placeholder="Search by name..."
            className="flex-1 rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm font-medium shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="rounded-lg bg-foreground px-6 h-[var(--density-button-height)] text-sm font-bold text-background hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {hasSearched && (
          <div className="mt-5 border-t border-border pt-5">
            {searchResults.length === 0 ? (
              <p className="text-sm font-medium text-muted-foreground italic">No active students found matching &quot;{searchQuery}&quot;.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                {searchResults.map((s) => {
                  const name = formatStudentName(s.first_name, s.last_name, s.preferred_name);
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-all ${isSelected ? "bg-primary-50 ring-2 ring-inset ring-primary/40" : "hover:bg-muted/50"}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-black text-primary-700 uppercase">{s.first_name[0]}{s.last_name[0]}</div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isSelected ? 'text-primary-900' : 'text-foreground'}`}>{name}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">Age {calculateAge(s.dob)}</p>
                      </div>
                      {isSelected && <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm animate-fade-in-up">
          <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-black">2</span>
            Set Start Date
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            <div className="w-full sm:w-auto">
              <label htmlFor="startDate" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Enrollment Start Date</label>
              <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm font-medium shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
            </div>
            <div className="flex-1 rounded-xl bg-primary-50 border border-primary-100 px-5 py-3.5 text-sm text-primary-900 font-bold shadow-sm">
              <span className="text-primary-600 opacity-70 uppercase tracking-widest text-[10px] block mb-0.5">Ready to Enroll</span>
              {formatStudentName(selectedStudent.first_name, selectedStudent.last_name, selectedStudent.preferred_name)} → <span className="underline decoration-primary/30 underline-offset-4">{className}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-4 pt-4">
        <Link href={`/classes/${classId}`} className="rounded-lg border border-border bg-background px-6 h-[var(--density-button-height)] text-sm font-bold text-foreground shadow-sm hover:bg-muted active:scale-95 transition-all flex items-center">Cancel</Link>
        <button onClick={handleEnroll} disabled={!selectedStudent || isEnrolling} className="rounded-lg bg-primary px-8 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {isEnrolling ? "Enrolling..." : "Enroll Student"}
        </button>
      </div>
    </div>
  );
}