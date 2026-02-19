import { getObservationFeed } from '@/lib/actions/observations';
import { listStudents } from '@/lib/actions/students';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import Link from 'next/link';
import { ObservationCard } from '@/components/domain/observations/observation-card';
import { FeedFilters } from '@/components/domain/observations/feed-filters';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    student?: string;
    page?: string;
  }>;
}

export default async function ObservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const context = await getTenantContext();
  const canCreate = hasPermission(context, Permissions.CREATE_OBSERVATION);
  const canPublish = hasPermission(context, Permissions.PUBLISH_OBSERVATION);

  const page = parseInt(params.page ?? '1', 10);
  const status = (params.status as 'draft' | 'published' | 'archived') || undefined;
  const studentId = params.student || undefined;

  const [feedResult, studentsResult] = await Promise.all([
    getObservationFeed({ page, perPage: 20, status, studentId }),
    listStudents(),
  ]);

  const feed = feedResult.data ?? [];
  const students = studentsResult.data ?? [];
  const pagination = feedResult.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Observations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Capture and review learning moments
          </p>
        </div>
        {canCreate && (
          <Link
            href="/pedagogy/observations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Observation
          </Link>
        )}
      </div>

      {/* Filters */}
      <FeedFilters
        students={students.map((s) => ({
          id: s.id,
          name: s.preferred_name
            ? `${s.preferred_name} ${s.last_name}`
            : `${s.first_name} ${s.last_name}`,
        }))}
        currentStatus={status}
        currentStudentId={studentId}
      />

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">No observations yet</p>
          <p className="mt-1 text-sm text-gray-500">
            {canCreate
              ? 'Create your first observation to get started.'
              : 'Observations will appear here once guides start recording.'}
          </p>
          {canCreate && (
            <Link
              href="/pedagogy/observations/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              New Observation
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            <ObservationCard
              key={item.id}
              observation={item}
              currentUserId={context.user.id}
              canPublish={canPublish}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pagination.per_page + 1} to{' '}
            {Math.min(page * pagination.per_page, pagination.total)} of{' '}
            {pagination.total} observations
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/pedagogy/observations?page=${page - 1}${status ? `&status=${status}` : ''}${studentId ? `&student=${studentId}` : ''}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < pagination.total_pages && (
              <Link
                href={`/pedagogy/observations?page=${page + 1}${status ? `&status=${status}` : ''}${studentId ? `&student=${studentId}` : ''}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
