// src/app/(app)/incidents/[id]/page.tsx
//
// Incident detail page. Shows the full record plus notification
// workflow. Serious incidents show the 24h countdown and the
// regulatory notification form.

import { IncidentDetail } from '@/components/domain/incidents/incident-detail';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { getIncident } from '@/lib/actions/incidents';
import { Permissions } from '@/lib/constants/permissions';
import { notFound, redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_INCIDENTS)) {
    redirect('/dashboard');
  }

  const result = await getIncident(id);
  if (!result.data) notFound();

  const canManage = hasPermission(context, Permissions.MANAGE_INCIDENTS);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <IncidentDetail incident={result.data} canManage={canManage} />
    </div>
  );
}
