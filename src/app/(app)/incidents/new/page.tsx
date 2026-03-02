// src/app/(app)/incidents/new/page.tsx
//
// Server Component wrapper for the incident capture form.
// Loads the student list so the form can select which children
// were involved. Requires CREATE_INCIDENT permission.

import { IncidentCaptureForm } from '@/components/domain/incidents/incident-capture-form';
import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Log Incident' };

export default async function NewIncidentPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.CREATE_INCIDENT)) {
    redirect('/incidents');
  }

  const supabase = await createSupabaseServerClient();

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .eq('tenant_id', context.tenant.id)
    .is('deleted_at', null)
    .order('last_name', { ascending: true });

  // Two-step query: get active tenant user IDs, then resolve names
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', context.tenant.id)
    .eq('status', 'active')
    .is('deleted_at', null);

  const staffUserIds = tenantUsers?.map((tu) => tu.user_id) ?? [];

  const { data: staff } = staffUserIds.length > 0
    ? await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', staffUserIds)
    : { data: [] as { id: string; first_name: string | null; last_name: string | null }[] };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Log Incident
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Record the details before end of day. Serious incidents require regulatory notification within 24 hours.
        </p>
      </div>

      <IncidentCaptureForm
        students={students ?? []}
        staff={staff ?? []}
        currentUserId={context.user.id}
      />
    </div>
  );
}
