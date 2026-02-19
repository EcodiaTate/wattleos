"use client";

import type { Student } from "@/types/domain";
import { useEffect, useRef, useState } from "react";

interface StudentPickerProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelect: (studentId: string) => void;
}

export function StudentPicker({
  students,
  selectedStudentId,
  onSelect,
}: StudentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = students.find((s) => s.id === selectedStudentId);
  const filtered = students.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.preferred_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-background px-3 py-2 text-sm transition-colors hover:bg-background"
      >
        {selected ? (
          <>
            {selected.photo_url ? (
              <img
                src={selected.photo_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                {selected.first_name.charAt(0)}
                {selected.last_name.charAt(0)}
              </div>
            )}
            <span className="font-medium text-foreground">
              {selected.preferred_name ?? selected.first_name}{" "}
              {selected.last_name}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Select a student...</span>
        )}
        <svg
          className="ml-1 h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg borderborder-border bg-background shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full rounded borderborder-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Student list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No students found.
              </div>
            ) : (
              filtered.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    onSelect(student.id);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background ${
                    student.id === selectedStudentId ? "bg-amber-50" : ""
                  }`}
                >
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {student.first_name.charAt(0)}
                      {student.last_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-foreground">
                      {student.preferred_name ?? student.first_name}{" "}
                      {student.last_name}
                    </span>
                  </div>
                  {student.id === selectedStudentId && (
                    <svg
                      className="ml-auto h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
