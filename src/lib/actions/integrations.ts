// src/lib/actions/integrations.ts
//
// ============================================================
// WattleOS V2 — Integration Server Actions
// ============================================================
// Manages integration configuration (CRUD) and orchestrates
// integration operations (provision folders, upload files).
//
// WHY separate from the client libraries: Server actions handle
// auth (requirePermission), config lookup, sync logging, and
// error normalization. The client libraries are pure API wrappers
// that know nothing about WattleOS.
// ============================================================

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { ActionResponse, success, failure, ErrorCodes } from '@/types/api';
import type {
  IntegrationConfig,
  IntegrationSyncLog,
  StudentPortfolioFolder,
} from '@/types/domain';
import type { IntegrationProvider } from '@/lib/constants/integrations';

// ============================================================
// Input Types
// ============================================================

export interface SaveIntegrationConfigInput {
  provider: IntegrationProvider;
  is_enabled: boolean;
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface ProvisionPortfolioInput {
  student_id: string;
  student_name: string;
  year?: number;
  parent_emails?: string[];
}

// ============================================================
// GET ALL INTEGRATION CONFIGS
// ============================================================

export async function listIntegrationConfigs(): Promise<
  ActionResponse<IntegrationConfig[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .is('deleted_at', null)
      .order('provider');

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as IntegrationConfig[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to list configs';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE INTEGRATION CONFIG
// ============================================================

export async function getIntegrationConfig(
  provider: IntegrationProvider
): Promise<ActionResponse<IntegrationConfig | null>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', provider)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as IntegrationConfig | null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to get config';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SAVE (UPSERT) INTEGRATION CONFIG
// ============================================================

export async function saveIntegrationConfig(
  input: SaveIntegrationConfigInput
): Promise<ActionResponse<IntegrationConfig>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('integration_configs')
      .upsert(
        {
          tenant_id: context.tenant.id,
          provider: input.provider,
          is_enabled: input.is_enabled,
          credentials: input.credentials,
          settings: input.settings,
        },
        { onConflict: 'tenant_id,provider' }
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    // Log the config change
    await logSyncOperation(supabase, context.tenant.id, {
      provider: input.provider,
      operation: 'config_updated',
      status: 'success',
      request_data: { is_enabled: input.is_enabled },
    });

    return success(data as IntegrationConfig);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to save config';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE INTEGRATION CONFIG
// ============================================================

export async function deleteIntegrationConfig(
  provider: IntegrationProvider
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('integration_configs')
      .update({ deleted_at: new Date().toISOString(), is_enabled: false })
      .eq('provider', provider)
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete config';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PROVISION STUDENT PORTFOLIO FOLDER (Google Drive)
// ============================================================
// Orchestrates: lookup config → create Drive client → provision
// folder → store mapping → optionally share with parents → log.
// ============================================================

export async function provisionStudentPortfolio(
  input: ProvisionPortfolioInput
): Promise<ActionResponse<StudentPortfolioFolder>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const year = input.year ?? new Date().getFullYear();

    // 1. Check if folder already exists for this student + year
    const { data: existing } = await supabase
      .from('student_portfolio_folders')
      .select('*')
      .eq('student_id', input.student_id)
      .eq('year', year)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return success(existing as StudentPortfolioFolder);
    }

    // 2. Get Google Drive config
    const { data: config } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', 'google_drive')
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (!config) {
      return failure(
        'Google Drive integration is not configured or enabled',
        ErrorCodes.INTEGRATION_ERROR
      );
    }

    const configData = config as IntegrationConfig;
    const credentials = configData.credentials as {
      service_account_email: string;
      private_key: string;
      root_folder_id: string;
    };

    if (
      !credentials.service_account_email ||
      !credentials.private_key ||
      !credentials.root_folder_id
    ) {
      return failure(
        'Google Drive credentials are incomplete',
        ErrorCodes.INTEGRATION_ERROR
      );
    }

    // 3. Dynamically import and call the Drive client
    // WHY dynamic import: googleapis is a large package. Only load it
    // when actually needed, not on every server action import.
    const { createDriveClient, provisionPortfolioFolder, shareFolderWithUser } =
      await import('@/lib/integrations/google-drive/client');

    const drive = createDriveClient(credentials);

    const result = await provisionPortfolioFolder(
      drive,
      credentials.root_folder_id,
      input.student_name,
      year
    );

    // 4. Store the folder mapping
    const { data: folderRecord, error: insertError } = await supabase
      .from('student_portfolio_folders')
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        drive_folder_id: result.folder_id,
        drive_folder_url: result.folder_url,
        year,
      })
      .select()
      .single();

    if (insertError) {
      return failure(insertError.message, ErrorCodes.CREATE_FAILED);
    }

    // 5. Share with parent emails if configured
    const settings = configData.settings as { auto_share_with_parents?: boolean };
    if (settings.auto_share_with_parents && input.parent_emails) {
      for (const email of input.parent_emails) {
        try {
          await shareFolderWithUser(drive, result.folder_id, email, 'reader');
        } catch {
          // Non-critical — log but don't fail the provisioning
          await logSyncOperation(supabase, context.tenant.id, {
            provider: 'google_drive',
            operation: 'share_folder',
            entity_type: 'student',
            entity_id: input.student_id,
            status: 'failure',
            error_message: `Failed to share with ${email}`,
          });
        }
      }
    }

    // 6. Log success
    await logSyncOperation(supabase, context.tenant.id, {
      provider: 'google_drive',
      operation: 'provision_folder',
      entity_type: 'student',
      entity_id: input.student_id,
      status: 'success',
      response_data: { folder_id: result.folder_id, year },
    });

    return success(folderRecord as StudentPortfolioFolder);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to provision portfolio';
    return failure(message, ErrorCodes.INTEGRATION_ERROR);
  }
}

// ============================================================
// GET STUDENT PORTFOLIO FOLDER
// ============================================================

export async function getStudentPortfolioFolder(
  studentId: string,
  year?: number
): Promise<ActionResponse<StudentPortfolioFolder | null>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('student_portfolio_folders')
      .select('*')
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('year', { ascending: false });

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as StudentPortfolioFolder | null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to get portfolio folder';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST SYNC LOGS
// ============================================================

export async function listSyncLogs(params: {
  provider?: IntegrationProvider;
  status?: 'success' | 'failure' | 'pending';
  limit?: number;
}): Promise<ActionResponse<IntegrationSyncLog[]>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const limit = params.limit ?? 50;

    let query = supabase
      .from('integration_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params.provider) {
      query = query.eq('provider', params.provider);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as IntegrationSyncLog[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to list sync logs';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// TEST INTEGRATION CONNECTION
// ============================================================
// Verifies that the credentials work by performing a lightweight
// API call (e.g., list root folder for Drive, retrieve account
// for Stripe).
// ============================================================

export async function testIntegrationConnection(
  provider: IntegrationProvider
): Promise<ActionResponse<{ connected: boolean; message: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data: config } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', provider)
      .is('deleted_at', null)
      .maybeSingle();

    if (!config) {
      return failure('Integration not configured', ErrorCodes.NOT_FOUND);
    }

    const configData = config as IntegrationConfig;

    if (provider === 'google_drive') {
      const credentials = configData.credentials as {
        service_account_email: string;
        private_key: string;
        root_folder_id: string;
      };

      const { createDriveClient } = await import(
        '@/lib/integrations/google-drive/client'
      );
      const drive = createDriveClient(credentials);

      // Try to get the root folder
      const response = await drive.files.get({
        fileId: credentials.root_folder_id,
        fields: 'id, name',
      });

      await logSyncOperation(supabase, context.tenant.id, {
        provider: 'google_drive',
        operation: 'test_connection',
        status: 'success',
      });

      return success({
        connected: true,
        message: `Connected to folder "${response.data.name}"`,
      });
    }

    // Add other providers here as they're implemented
    return failure(
      `Test not implemented for ${provider}`,
      ErrorCodes.INTEGRATION_ERROR
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Connection test failed';
    return success({
      connected: false,
      message,
    });
  }
}

// ============================================================
// HELPER: Log sync operation
// ============================================================

async function logSyncOperation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  log: {
    provider: string;
    operation: string;
    entity_type?: string;
    entity_id?: string;
    status: 'success' | 'failure' | 'pending';
    request_data?: Record<string, unknown>;
    response_data?: Record<string, unknown>;
    error_message?: string;
  }
): Promise<void> {
  try {
    await supabase.from('integration_sync_logs').insert({
      tenant_id: tenantId,
      provider: log.provider,
      operation: log.operation,
      entity_type: log.entity_type ?? null,
      entity_id: log.entity_id ?? null,
      status: log.status,
      request_data: log.request_data ?? {},
      response_data: log.response_data ?? {},
      error_message: log.error_message ?? null,
    });
  } catch {
    // Sync logging is non-critical — don't fail the main operation
    console.error('Failed to write sync log');
  }
}