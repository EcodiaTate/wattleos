'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MasteryStatus, CurriculumLevel } from '@/types/domain';
import type { MasteryWithNode } from '@/lib/actions/mastery';
import { updateMasteryStatus } from '@/lib/actions/mastery';
import {
  MASTERY_STATUS_CONFIG,
  getNextMasteryStatus,
  MASTERY_STATUS_ORDER,
} from '@/lib/utils/mastery-status';
import type { CurriculumTreeNode } from '@/lib/utils/curriculum-tree';

// ============================================================
// Props
// ============================================================
interface MasteryGridProps {
  studentId: string;
  studentName: string;
  tree: CurriculumTreeNode[];
  masteryData: MasteryWithNode[];
  canManage: boolean;
  summary: {
    total: number;
    not_started: number;
    presented: number;
    practicing: number;
    mastered: number;
  };
}

// ============================================================
// MasteryGrid
// ============================================================
export function MasteryGrid({
  studentId,
  studentName,
  tree,
  masteryData,
  canManage,
  summary,
}: MasteryGridProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(() => {
    return new Set(tree.map((a) => a.id));
  });
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, MasteryStatus>
  >({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Build a lookup map: curriculum_node_id → mastery status
  const statusMap = new Map<string, MasteryStatus>();
  for (const record of masteryData) {
    statusMap.set(record.curriculum_node_id, record.status);
  }

  // Apply optimistic updates on top
  for (const [nodeId, status] of Object.entries(optimisticStatuses)) {
    statusMap.set(nodeId, status);
  }

  function getStatus(nodeId: string): MasteryStatus {
    return statusMap.get(nodeId) ?? 'not_started';
  }

  const toggleArea = useCallback((areaId: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }, []);

  async function handleStatusClick(nodeId: string) {
    if (!canManage) return;

    const current = getStatus(nodeId);
    const next = getNextMasteryStatus(current);

    // Optimistic update
    setOptimisticStatuses((prev) => ({ ...prev, [nodeId]: next }));

    const result = await updateMasteryStatus({
      studentId,
      curriculumNodeId: nodeId,
      newStatus: next,
    });

    if (result.error) {
      // Revert optimistic update
      setOptimisticStatuses((prev) => {
        const copy = { ...prev };
        delete copy[nodeId];
        return copy;
      });
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  async function handleStatusSelect(nodeId: string, newStatus: MasteryStatus) {
    if (!canManage) return;

    setOptimisticStatuses((prev) => ({ ...prev, [nodeId]: newStatus }));

    const result = await updateMasteryStatus({
      studentId,
      curriculumNodeId: nodeId,
      newStatus,
    });

    if (result.error) {
      setOptimisticStatuses((prev) => {
        const copy = { ...prev };
        delete copy[nodeId];
        return copy;
      });
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Progress Overview
          </h3>
          <span className="text-xs text-gray-500">
            {summary.mastered} of {summary.total} outcomes mastered
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-gray-100">
          {summary.total > 0 && (
            <>
              <div
                className="bg-green-400 transition-all"
                style={{
                  width: `${(summary.mastered / summary.total) * 100}%`,
                }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{
                  width: `${(summary.practicing / summary.total) * 100}%`,
                }}
              />
              <div
                className="bg-blue-400 transition-all"
                style={{
                  width: `${(summary.presented / summary.total) * 100}%`,
                }}
              />
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {MASTERY_STATUS_ORDER.map((status) => {
            const config = MASTERY_STATUS_CONFIG[status];
            const count = summary[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotColor}`} />
                <span className="text-xs text-gray-600">
                  {config.label}: <span className="font-semibold">{count}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Curriculum tree with mastery statuses */}
      <div className="space-y-3">
        {tree.map((area) => (
          <AreaSection
            key={area.id}
            area={area}
            isExpanded={expandedAreas.has(area.id)}
            onToggle={() => toggleArea(area.id)}
            getStatus={getStatus}
            canManage={canManage}
            onStatusClick={handleStatusClick}
            onStatusSelect={handleStatusSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// AreaSection - collapsible area with strands/outcomes
// ============================================================
function AreaSection({
  area,
  isExpanded,
  onToggle,
  getStatus,
  canManage,
  onStatusClick,
  onStatusSelect,
}: {
  area: CurriculumTreeNode;
  isExpanded: boolean;
  onToggle: () => void;
  getStatus: (nodeId: string) => MasteryStatus;
  canManage: boolean;
  onStatusClick: (nodeId: string) => void;
  onStatusSelect: (nodeId: string, status: MasteryStatus) => void;
}) {
  // Count statuses within this area
  const outcomes = collectOutcomes(area);
  const counts = { mastered: 0, practicing: 0, presented: 0, not_started: 0 };
  for (const o of outcomes) {
    counts[getStatus(o.id)]++;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Area header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="inline-flex rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700">
            Area
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {area.title}
          </span>
        </div>

        {/* Mini progress indicator */}
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            {outcomes.length > 0 && (
              <>
                <div className="bg-green-400" style={{ width: `${(counts.mastered / outcomes.length) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(counts.practicing / outcomes.length) * 100}%` }} />
                <div className="bg-blue-400" style={{ width: `${(counts.presented / outcomes.length) * 100}%` }} />
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {counts.mastered}/{outcomes.length}
          </span>
        </div>
      </button>

      {/* Strands and outcomes */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {area.children.map((strand) => (
            <StrandSection
              key={strand.id}
              strand={strand}
              getStatus={getStatus}
              canManage={canManage}
              onStatusClick={onStatusClick}
              onStatusSelect={onStatusSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// StrandSection - strand header + outcome rows
// ============================================================
function StrandSection({
  strand,
  getStatus,
  canManage,
  onStatusClick,
  onStatusSelect,
}: {
  strand: CurriculumTreeNode;
  getStatus: (nodeId: string) => MasteryStatus;
  canManage: boolean;
  onStatusClick: (nodeId: string) => void;
  onStatusSelect: (nodeId: string, status: MasteryStatus) => void;
}) {
  return (
    <div>
      <div className="bg-gray-50 px-4 py-2 pl-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700">
            Strand
          </span>
          <span className="text-xs font-semibold text-gray-700">
            {strand.title}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {strand.children.map((outcome) => (
          <OutcomeRow
            key={outcome.id}
            outcome={outcome}
            status={getStatus(outcome.id)}
            canManage={canManage}
            onStatusClick={onStatusClick}
            onStatusSelect={onStatusSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OutcomeRow - single outcome with clickable status badge
// ============================================================
function OutcomeRow({
  outcome,
  status,
  canManage,
  onStatusClick,
  onStatusSelect,
}: {
  outcome: CurriculumTreeNode;
  status: MasteryStatus;
  canManage: boolean;
  onStatusClick: (nodeId: string) => void;
  onStatusSelect: (nodeId: string, status: MasteryStatus) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const config = MASTERY_STATUS_CONFIG[status];

  return (
    <div className="group flex items-center justify-between px-4 py-2 pl-14 transition-colors hover:bg-gray-50">
      <span className="mr-3 min-w-0 flex-1 text-sm text-gray-800">
        {outcome.title}
      </span>

      <div className="relative flex-shrink-0">
        {/* Status badge - click to cycle, right-click/long-press for picker */}
        <button
          onClick={() => {
            if (canManage) onStatusClick(outcome.id);
          }}
          onContextMenu={(e) => {
            if (canManage) {
              e.preventDefault();
              setShowPicker(!showPicker);
            }
          }}
          disabled={!canManage}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${config.bgColor} ${config.color} ${config.borderColor} border ${
            canManage
              ? 'cursor-pointer hover:shadow-sm active:scale-95'
              : 'cursor-default'
          }`}
          title={
            canManage
              ? `Click to advance · Right-click for picker · ${config.description}`
              : config.description
          }
        >
          <span className={`inline-block h-2 w-2 rounded-full ${config.dotColor}`} />
          {config.label}
        </button>

        {/* Status picker dropdown */}
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {MASTERY_STATUS_ORDER.map((s) => {
                const c = MASTERY_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusSelect(outcome.id, s);
                      setShowPicker(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 ${
                      s === status ? 'font-semibold' : ''
                    }`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${c.dotColor}`} />
                    <span className={c.color}>{c.label}</span>
                    {s === status && (
                      <svg className="ml-auto h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper: Collect all outcome-level descendants of a node
// ============================================================
function collectOutcomes(node: CurriculumTreeNode): CurriculumTreeNode[] {
  const outcomes: CurriculumTreeNode[] = [];
  if (node.level === 'outcome') {
    outcomes.push(node);
  }
  for (const child of node.children) {
    outcomes.push(...collectOutcomes(child));
  }
  return outcomes;
}
