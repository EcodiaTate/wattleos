// src/app/(app)/classes/[id]/enroll/page.tsx
//
// ============================================================
// WattleOS V2 - Enroll Student in Class Page
// ============================================================
// Server Component wrapper. Loads class info and passes to
// the client enrollment form.
//
// Why a dedicated page: Enrollment needs a student search/picker
// and a date input. That's enough complexity to warrant its own
// page rather than a modal - especially on mobile/iPad where
// modals are painful.
// ============================================================

import { getTenantContext } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { getClass } from '@/lib/actions/classes';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { EnrollStudentForm } from '@/components/domain/sis/EnrollStudentForm';
import Link from 'next/link';

interface EnrollPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnrollStudentPage({ params }: EnrollPageProps) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_ENROLLMENT)) {
    redirect(`/classes/${id}`);
  }

  const result = await getClass(id);
  if (result.error || !result.data) {
    notFound();
  }

  const classData = result.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/classes" className="hover:text-gray-700">
          Classes
        </Link>
        <span>/</span>
        <Link href={`/classes/${id}`} className="hover:text-gray-700">
          {classData.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Enroll Student</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Enroll Student in {classData.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search for an existing student and set their enrollment start date.
          {classData.cycle_level && (
            <span className="ml-1 text-gray-400">
              (Ages {classData.cycle_level})
            </span>
          )}
        </p>
      </div>

      {/* Form */}
      <EnrollStudentForm classId={id} className={classData.name} />
    </div>
  );
}