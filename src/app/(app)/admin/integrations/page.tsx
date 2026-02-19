// src/app/(app)/admin/integrations/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Integration Settings
// ============================================================
// Server Component. Permission-gated to MANAGE_INTEGRATIONS.
// Shows all available integrations as cards with enable/disable
// toggle and configuration status.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listIntegrationConfigs } from '@/lib/actions/integrations';
import { redirect } from 'next/navigation';
import { IntegrationDashboardClient } from '@/components/domain/admin/integration-dashboard-client';

export default async function IntegrationsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_INTEGRATIONS)) {
    redirect('/dashboard');
  }

  const result = await listIntegrationConfigs();
  const configs = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect WattleOS to external services for billing, storage, and payroll.
        </p>
      </div>

      <IntegrationDashboardClient existingConfigs={configs} />
    </div>
  );
}