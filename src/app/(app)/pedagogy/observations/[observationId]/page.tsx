// src/app/(app)/pedagogy/observations/[observationId]/page.tsx
//
// ============================================================
// WattleOS V2 - Observation Detail Page
// ============================================================
// Server Component. Shows a single observation with full content,
// media gallery, student tags, outcome tags, and actions.
//
// CHANGES from previous version:
// - Replaced inline media rendering with MediaGallery variant="full"
// - Uses flat .students / .outcomes / .media (Batch 1 type fix)
// ============================================================

import { getObservation } from '@/lib/actions/observations';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ObservationDetailActions } from '@/components/domain/observations/observation-detail-actions';
import { MediaGallery } from '@/components/domain/observations/media-gallery';

interface PageProps {
  params: Promise<{ observationId: string }>;
}

export default async function ObservationDetailPage({ params }: PageProps) {
  const { observationId } = await params;
  const context = await getTenantContext();
  const canPublish = hasPermission(context, Permissions.PUBLISH_OBSERVATION);

  const result = await getObservation(observationId);

  if (!result.data) {
    redirect('/pedagogy/observations');
  }

  const obs = result.data;
  const authorName =
    [obs.author.first_name, obs.author.last_name]
      .filter(Boolean)
      .join(' ') || 'Unknown';
  const isAuthor = obs.author.id === context.user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/pedagogy/observations"
          className="text-gray-500 hover:text-gray-700"
        >
          Observations
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">Detail</span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                {obs.author.avatar_url ? (
                  <img
                    src={obs.author.avatar_url}
                    alt={authorName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  authorName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {authorName}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(obs.created_at).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                obs.status === 'draft'
                  ? 'bg-amber-100 text-amber-700'
                  : obs.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {obs.status.charAt(0).toUpperCase() + obs.status.slice(1)}
            </span>
          </div>

          {/* Published date */}
          {obs.published_at && (
            <p className="mt-2 text-xs text-green-600">
              Published{' '}
              {new Date(obs.published_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Content */}
          {obs.content && (
            <div className="mt-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {obs.content}
              </p>
            </div>
          )}

          {/* Media gallery - full variant with larger thumbnails + lightbox */}
          {obs.media.length > 0 && (
            <MediaGallery media={obs.media} variant="full" />
          )}

          {/* Students */}
          {obs.students.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Students
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {obs.students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">
                        {student.first_name.charAt(0)}
                      </span>
                    )}
                    {student.first_name} {student.last_name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes */}
          {obs.outcomes.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Curriculum Outcomes
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {obs.outcomes.map((outcome) => (
                  <span
                    key={outcome.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
                  >
                    <span
                      className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
                        outcome.level === 'outcome'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {outcome.level}
                    </span>
                    {outcome.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <ObservationDetailActions
            observationId={obs.id}
            status={obs.status}
            isAuthor={isAuthor}
            canPublish={canPublish}
          />
        </div>
      </div>
    </div>
  );
}