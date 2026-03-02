'use client';

// src/components/domain/incidents/incident-register.tsx
//
// Filterable, paginated incident register table.
// Filters: status, type, serious-only, date range.
// Each row links to the incident detail page.

import type { Incident, IncidentType, IncidentSeverity, IncidentStatus } from '@/types/domain';
import { GlowTarget } from '@/components/domain/glow/glow-registry';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  incidents: Incident[];
  total: number;
  canManage: boolean;
}

const TYPE_LABELS: Record<IncidentType, string> = {
  injury: 'Injury',
  illness: 'Illness',
  trauma: 'Trauma',
  near_miss: 'Near Miss',
};

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  minor: 'var(--attendance-present)',
  moderate: 'color-mix(in srgb, orange 80%, transparent)',
  serious: 'var(--destructive)',
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  parent_notified: 'Parent Notified',
  regulator_notified: 'Regulator Notified',
  closed: 'Closed',
};

const STATUS_DOT: Record<IncidentStatus, string> = {
  open: 'var(--destructive)',
  parent_notified: 'color-mix(in srgb, orange 90%, transparent)',
  regulator_notified: 'color-mix(in srgb, var(--primary) 80%, transparent)',
  closed: 'var(--muted-foreground)',
};

export function IncidentRegister({ incidents, total, canManage }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [seriousOnly, setSeriousOnly] = useState(false);

  const filtered = incidents.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (typeFilter && i.incident_type !== typeFilter) return false;
    if (seriousOnly && !i.is_serious_incident) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <GlowTarget id="incidents-filter-status" category="select" label="Filter by status">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
            style={{ color: 'var(--foreground)' }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="parent_notified">Parent Notified</option>
            <option value="regulator_notified">Regulator Notified</option>
            <option value="closed">Closed</option>
          </select>
        </GlowTarget>

        <GlowTarget id="incidents-filter-type" category="select" label="Filter by type">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
            style={{ color: 'var(--foreground)' }}
          >
            <option value="">All types</option>
            <option value="injury">Injury</option>
            <option value="illness">Illness</option>
            <option value="trauma">Trauma</option>
            <option value="near_miss">Near Miss</option>
          </select>
        </GlowTarget>

        <button
          onClick={() => setSeriousOnly((v) => !v)}
          className="touch-target rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
          style={{
            borderColor: seriousOnly ? 'var(--destructive)' : 'var(--border)',
            color: seriousOnly ? 'var(--destructive)' : 'var(--muted-foreground)',
            background: seriousOnly ? 'color-mix(in srgb, var(--destructive) 8%, transparent)' : 'var(--background)',
          }}
        >
          Serious only
        </button>

        <p className="ml-auto self-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {filtered.length} of {total}
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-12 text-center"
          style={{ background: 'var(--background)' }}
        >
          <svg
            className="mx-auto h-10 w-10"
            style={{ color: 'var(--empty-state-icon)' }}
            fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            No incidents recorded
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {statusFilter || typeFilter || seriousOnly ? 'Try adjusting your filters.' : 'Use "Log Incident" to record one.'}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
          style={{ background: 'var(--background)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident, i) => (
                <GlowTarget key={incident.id} id={`incidents-row-${incident.id}`} category="row" label={`${TYPE_LABELS[incident.incident_type]} incident`}>
                  <tr
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {new Date(incident.occurred_at).toLocaleDateString('en-AU', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--foreground)' }} className="font-medium">
                          {TYPE_LABELS[incident.incident_type]}
                        </span>
                        {incident.is_serious_incident && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: 'color-mix(in srgb, var(--destructive) 12%, transparent)', color: 'var(--destructive)' }}
                          >
                            Serious
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {incident.location}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                        style={{
                          background: `color-mix(in srgb, ${SEVERITY_STYLES[incident.severity]} 15%, transparent)`,
                          color: SEVERITY_STYLES[incident.severity],
                        }}
                      >
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: STATUS_DOT[incident.status] }}
                        />
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {STATUS_LABELS[incident.status]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="touch-target rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                        style={{ color: 'var(--primary)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                </GlowTarget>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
