import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listStudents } from '@/lib/actions/students';
import { listCurriculumInstances } from '@/lib/actions/curriculum';
import { MasteryPageClient } from './mastery-page-client';

export default async function MasteryPage() {
  const context = await getTenantContext();
  const canManage = hasPermission(context, Permissions.MANAGE_MASTERY);
  const canViewStudents = hasPermission(context, Permissions.VIEW_STUDENTS);

  if (!canViewStudents) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          You do not have permission to view student data.
        </p>
      </div>
    );
  }

  const [studentsResult, instancesResult] = await Promise.all([
    listStudents(),
    listCurriculumInstances(),
  ]);

  const students = studentsResult.data ?? [];
  const instances = instancesResult.data ?? [];

  if (instances.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mastery Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track student progress across curriculum outcomes
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Set up a curriculum first before tracking mastery.
          </p>
          <a
            href="/pedagogy/curriculum"
            className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Curriculum
          </a>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mastery Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track student progress across curriculum outcomes
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Add students before tracking mastery.
          </p>
          <a
            href="/students"
            className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Manage Students
          </a>
        </div>
      </div>
    );
  }

  return (
    <MasteryPageClient
      students={students}
      instances={instances}
      canManage={canManage}
    />
  );
}
