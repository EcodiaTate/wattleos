import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listStudents } from '@/lib/actions/students';
import { listCurriculumInstances, getCurriculumTree } from '@/lib/actions/curriculum';
import { getClassMasteryHeatmap } from '@/lib/actions/mastery';
import { buildTree } from '@/lib/utils/curriculum-tree';
import { ClassHeatmap } from '@/components/domain/mastery/class-heatmap';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ instance?: string }>;
}

export default async function HeatmapPage({ searchParams }: PageProps) {
  const { instance: instanceParam } = await searchParams;
  const context = await getTenantContext();
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

  if (instances.length === 0 || students.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href="/pedagogy/mastery"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Mastery
          </Link>
          <span className="text-sm text-gray-400">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Class Heatmap</h1>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            {instances.length === 0
              ? 'Set up a curriculum first.'
              : 'Add students first.'}
          </p>
        </div>
      </div>
    );
  }

  // Use specified instance or default to first
  const selectedInstanceId = instanceParam ?? instances[0].id;
  const selectedInstance = instances.find((i) => i.id === selectedInstanceId) ?? instances[0];

  // Load tree and heatmap data
  const studentIds = students.map((s) => s.id);
  const [treeResult, heatmapResult] = await Promise.all([
    getCurriculumTree(selectedInstance.id),
    getClassMasteryHeatmap(selectedInstance.id, studentIds),
  ]);

  const tree = buildTree(treeResult.data ?? []);
  const heatmapRows = heatmapResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/pedagogy/mastery"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Mastery
          </Link>
          <span className="text-sm text-gray-400">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Class Heatmap</h1>
        </div>

        {/* Instance selector */}
        {instances.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Curriculum:</span>
            <div className="flex gap-1">
              {instances.map((inst) => (
                <Link
                  key={inst.id}
                  href={`/pedagogy/mastery/heatmap?instance=${inst.id}`}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    inst.id === selectedInstance.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {inst.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Viewing <span className="font-medium">{selectedInstance.name}</span> across{' '}
        <span className="font-medium">{students.length}</span> students.
        Each cell represents a student&apos;s mastery status for one curriculum outcome.
      </p>

      {/* Heatmap */}
      <ClassHeatmap
        rows={heatmapRows}
        tree={tree}
        instanceName={selectedInstance.name}
      />
    </div>
  );
}
