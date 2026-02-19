// src/app/(app)/pedagogy/observations/new/page.tsx
//
// ============================================================
// WattleOS V2 - New Observation Page
// ============================================================
// Server Component. Loads students, curriculum outcomes, and
// media consent data, then renders the capture form.
//
// CHANGES from previous version:
// - Added getStudentMediaConsentMap() call
// - Passes mediaConsent boolean per student to the form
// ============================================================

import { listStudents } from '@/lib/actions/students';
import {
  listCurriculumInstances,
  getCurriculumTree,
} from '@/lib/actions/curriculum';
import { getStudentMediaConsentMap } from '@/lib/actions/consent';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import { ObservationCaptureForm } from '@/components/domain/observations/observation-capture-form';

export default async function NewObservationPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.CREATE_OBSERVATION)) {
    redirect('/pedagogy/observations');
  }

  const canPublish = hasPermission(context, Permissions.PUBLISH_OBSERVATION);

  // Load students and curriculum data in parallel
  const [studentsResult, instancesResult] = await Promise.all([
    listStudents(),
    listCurriculumInstances(),
  ]);

  const students = studentsResult.data ?? [];
  const instances = instancesResult.data ?? [];

  // Load media consent for all students
  const studentIds = students.map((s) => s.id);
  const consentResult = await getStudentMediaConsentMap(studentIds);
  const consentMap = consentResult.data ?? {};

  // Load all curriculum nodes for all active instances
  // (for outcome tagging - we need a flat searchable list)
  let allOutcomes: Array<{
    id: string;
    title: string;
    level: string;
    instanceName: string;
  }> = [];

  for (const instance of instances.filter((i) => i.is_active)) {
    const treeResult = await getCurriculumTree(instance.id);
    const nodes = treeResult.data ?? [];
    // Only include outcomes and activities (not areas/strands) for tagging
    const outcomes = nodes
      .filter((n) => n.level === 'outcome' || n.level === 'activity')
      .map((n) => ({
        id: n.id,
        title: n.title,
        level: n.level,
        instanceName: instance.name,
      }));
    allOutcomes = [...allOutcomes, ...outcomes];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Observation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Capture a learning moment. Tag students and outcomes.
        </p>
      </div>

      <ObservationCaptureForm
        students={students.map((s) => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          preferredName: s.preferred_name,
          photoUrl: s.photo_url,
          mediaConsent: consentMap[s.id] ?? false,
        }))}
        outcomes={allOutcomes}
        canPublish={canPublish}
      />
    </div>
  );
}