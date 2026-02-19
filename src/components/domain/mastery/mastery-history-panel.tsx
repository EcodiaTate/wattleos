'use client';

import type { MasteryHistoryWithMeta } from '@/lib/actions/mastery';
import { MASTERY_STATUS_CONFIG } from '@/lib/utils/mastery-status';
import type { MasteryStatus } from '@/types/domain';

interface MasteryHistoryPanelProps {
  history: MasteryHistoryWithMeta[];
  showTitle?: boolean;
}

export function MasteryHistoryPanel({
  history,
  showTitle = true,
}: MasteryHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
        No mastery changes recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {showTitle && (
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Progress
          </h3>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {history.map((entry) => {
          const newConfig =
            MASTERY_STATUS_CONFIG[entry.new_status as MasteryStatus];
          const prevConfig = entry.previous_status
            ? MASTERY_STATUS_CONFIG[entry.previous_status as MasteryStatus]
            : null;

          const changedByName = entry.changed_by_user
            ? `${entry.changed_by_user.first_name ?? ''} ${entry.changed_by_user.last_name ?? ''}`.trim()
            : 'System';

          const date = new Date(entry.changed_at);
          const dateStr = date.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
          });
          const timeStr = date.toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">
                    {entry.curriculum_node_title || 'Unknown outcome'}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {prevConfig && (
                      <>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${prevConfig.bgColor} ${prevConfig.color}`}
                        >
                          {prevConfig.shortLabel}
                        </span>
                        <svg
                          className="h-2.5 w-2.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${newConfig.bgColor} ${newConfig.color}`}
                    >
                      {newConfig.shortLabel}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0 text-right">
                  <p className="text-[10px] text-gray-500">{dateStr}</p>
                  <p className="text-[10px] text-gray-400">{timeStr}</p>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                by {changedByName}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
