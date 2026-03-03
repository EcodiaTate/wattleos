// src/app/(app)/pedagogy/observations/new/page.tsx
//
// ============================================================
// WattleOS V2 - New Observation Page
// ============================================================
// Server Component. Loads students, curriculum outcomes, media
// consent data, and active sensitive periods for tagging.
// ============================================================

import { ObservationCaptureForm } from "@/components/domain/observations/observation-capture-form";
import { getStudentMediaConsentMap } from "@/lib/actions/consent";
import {
  getCurriculumTree,
  listCurriculumInstances,
} from "@/lib/actions/curriculum";
import { listStudents } from "@/lib/actions/students";
import { listActiveSensitivePeriods } from "@/lib/actions/three-period-lessons";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import type { ActivePeriodOption } from "@/components/domain/sensitive-periods/observation-period-tagger";
import type { CurriculumInstance, Student, StudentSensitivePeriodWithDetails } from "@/types/domain";

export const metadata = { title: "New Observation - WattleOS" };

export default async function NewObservationPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.CREATE_OBSERVATION)) {
    redirect("/pedagogy/observations");
  }

  const canPublish = hasPermission(context, Permissions.PUBLISH_OBSERVATION);

  const [studentsResult, instancesResult, activePeriodsResult] =
    await Promise.all([
      listStudents(),
      listCurriculumInstances(),
      listActiveSensitivePeriods(),
    ]);

  const students: Student[] = studentsResult.data ?? [];
  const instances: CurriculumInstance[] = instancesResult.data ?? [];

  // Build ActivePeriodOption list - one entry per active period with student name
  const activePeriods: ActivePeriodOption[] = (
    activePeriodsResult.data ?? []
  ).map((p: StudentSensitivePeriodWithDetails) => ({
    id: p.id,
    studentId: p.student_id,
    studentName: `${p.student.first_name} ${p.student.last_name}`,
    sensitivePeriod: p.sensitive_period,
    intensity: p.intensity,
  }));

  // Load media consent for all students
  const studentIds = students.map((s) => s.id);
  const consentResult = await getStudentMediaConsentMap(studentIds);
  const consentMap = consentResult.data ?? {};

  let allOutcomes: Array<{
    id: string;
    title: string;
    level: string;
    instanceName: string;
  }> = [];

  for (const instance of instances.filter((i) => i.is_active)) {
    const treeResult = await getCurriculumTree(instance.id);
    const nodes = treeResult.data ?? [];
    const outcomes = nodes
      .filter((n) => n.level === "outcome" || n.level === "activity")
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
        <h1 className="text-2xl font-bold text-foreground">New Observation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        activePeriods={activePeriods}
        canPublish={canPublish}
        tenantId={context.tenant.id}
      />
    </div>
  );
}
