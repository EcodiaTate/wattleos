"use client";

import { MasteryGrid } from "@/components/domain/mastery/mastery-grid";
import { MasteryHistoryPanel } from "@/components/domain/mastery/mastery-history-panel";
import { StudentPicker } from "@/components/domain/mastery/student-picker";
import { getCurriculumTree } from "@/lib/actions/curriculum";
import type {
  MasteryHistoryWithMeta,
  MasteryWithNode,
} from "@/lib/actions/mastery";
import {
  getStudentMastery,
  getStudentMasteryHistory,
  getStudentMasterySummary,
} from "@/lib/actions/mastery";
import type { CurriculumTreeNode } from "@/lib/utils/curriculum-tree";
import { buildTree } from "@/lib/utils/curriculum-tree";
import type { CurriculumInstance, Student } from "@/types/domain";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface MasteryPageClientProps {
  students: Student[];
  instances: CurriculumInstance[];
  canManage: boolean;
}

export function MasteryPageClient({
  students,
  instances,
  canManage,
}: MasteryPageClientProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    students.length > 0 ? students[0].id : null,
  );
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(
    instances[0]?.id ?? "",
  );
  const [tree, setTree] = useState<CurriculumTreeNode[]>([]);
  const [masteryData, setMasteryData] = useState<MasteryWithNode[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    not_started: 0,
    presented: 0,
    practicing: 0,
    mastered: 0,
  });
  const [history, setHistory] = useState<MasteryHistoryWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedStudentId || !selectedInstanceId) return;

    setIsLoading(true);

    const [treeResult, masteryResult, summaryResult, historyResult] =
      await Promise.all([
        getCurriculumTree(selectedInstanceId),
        getStudentMastery(selectedStudentId, selectedInstanceId),
        getStudentMasterySummary(selectedStudentId, selectedInstanceId),
        getStudentMasteryHistory(selectedStudentId, 20),
      ]);

    if (treeResult.data) {
      setTree(buildTree(treeResult.data));
    }
    if (masteryResult.data) {
      setMasteryData(masteryResult.data);
    }
    if (summaryResult.data) {
      setSummary(summaryResult.data);
    }
    if (historyResult.data) {
      setHistory(historyResult.data);
    }

    setIsLoading(false);
  }, [selectedStudentId, selectedInstanceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const studentName = selectedStudent
    ? `${selectedStudent.preferred_name ?? selectedStudent.first_name} ${selectedStudent.last_name}`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mastery Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track student progress across curriculum outcomes
          </p>
        </div>
        {selectedStudentId && (
          <Link
            href={`/pedagogy/portfolio/${selectedStudentId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            View Portfolio
          </Link>
        )}
      </div>

      {/* Selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <StudentPicker
          students={students}
          selectedStudentId={selectedStudentId}
          onSelect={setSelectedStudentId}
        />

        {instances.length > 1 && (
          <select
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        )}

        <Link
          href="/pedagogy/mastery/heatmap"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
            />
          </svg>
          Class Heatmap
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-amber-500" />
        </div>
      )}

      {/* Content */}
      {!isLoading && selectedStudentId && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main mastery grid */}
          <div>
            <MasteryGrid
              studentId={selectedStudentId}
              studentName={studentName}
              tree={tree}
              masteryData={masteryData}
              canManage={canManage}
              summary={summary}
            />
          </div>

          {/* Sidebar: recent history */}
          <div className="space-y-4">
            <MasteryHistoryPanel history={history} />
          </div>
        </div>
      )}
    </div>
  );
}
