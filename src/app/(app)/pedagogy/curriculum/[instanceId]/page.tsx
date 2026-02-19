import { getCurriculumTree } from '@/lib/actions/curriculum';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { buildTree, countNodes } from '@/lib/utils/curriculum-tree';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CurriculumTreeView } from '@/components/domain/curriculum/curriculum-tree-view';
import type { CurriculumInstance } from '@/types/domain';

interface PageProps {
  params: Promise<{ instanceId: string }>;
}

export default async function CurriculumInstancePage({ params }: PageProps) {
  const { instanceId } = await params;
  const context = await getTenantContext();
  const canManage = hasPermission(context, Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  // Fetch the instance metadata
  const { data: instance, error: instanceError } = await supabase
    .from('curriculum_instances')
    .select('*')
    .eq('id', instanceId)
    .is('deleted_at', null)
    .single();

  if (instanceError || !instance) {
    redirect('/pedagogy/curriculum');
  }

  // Fetch the full node tree
  const treeResult = await getCurriculumTree(instanceId);
  const flatNodes = treeResult.data ?? [];
  const tree = buildTree(flatNodes);
  const totalNodes = countNodes(tree);

  // Count by level
  const areaCt = flatNodes.filter((n) => n.level === 'area').length;
  const strandCt = flatNodes.filter((n) => n.level === 'strand').length;
  const outcomeCt = flatNodes.filter((n) => n.level === 'outcome').length;
  const activityCt = flatNodes.filter((n) => n.level === 'activity').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pedagogy/curriculum"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Curriculum
            </Link>
            <span className="text-sm text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">
              {(instance as CurriculumInstance).name}
            </h1>
          </div>
          {(instance as CurriculumInstance).description && (
            <p className="mt-1 text-sm text-gray-500">
              {(instance as CurriculumInstance).description}
            </p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <StatBadge label="Total" count={totalNodes} color="gray" />
        <StatBadge label="Areas" count={areaCt} color="purple" />
        <StatBadge label="Strands" count={strandCt} color="blue" />
        <StatBadge label="Outcomes" count={outcomeCt} color="green" />
        {activityCt > 0 && (
          <StatBadge label="Activities" count={activityCt} color="amber" />
        )}
      </div>

      {/* Tree */}
      <CurriculumTreeView
        instanceId={instanceId}
        initialTree={tree}
        canManage={canManage}
      />
    </div>
  );
}

function StatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors[color] ?? colors.gray}`}
    >
      <span className="font-bold">{count}</span> {label}
    </span>
  );
}
