// src/lib/auth/demo-mode.ts
//
// ============================================================
// Demo Mode — Portfolio bypass
// ============================================================
// When NEXT_PUBLIC_DEMO_MODE=true, all auth guards are bypassed
// and a mock admin context is returned. This lets unauthenticated
// visitors browse the app for portfolio / demo purposes.
//
// To enable:  set NEXT_PUBLIC_DEMO_MODE=true in .env.local
// To disable: remove the variable or set to anything else
//
// SECURITY: Never enable this in production with real data.
// ============================================================

import type { TenantContext, Tenant, User, Role } from '@/types/domain';
import { Permissions } from '@/lib/constants/permissions';

export function isDemoMode(): boolean {
  // SECURITY: Demo mode must NEVER be active in production — it bypasses all auth
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

const DEMO_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000000',
  slug: 'demo',
  name: 'Wattle Montessori Demo',
  domain: null,
  logo_url: null,
  timezone: 'Australia/Sydney',
  country: 'AU',
  currency: 'AUD',
  settings: {},
  plan_tier: 'enterprise',
  is_active: true,
  subscription_status: 'active',
  stripe_platform_customer_id: null,
  stripe_platform_subscription_id: null,
  trial_ends_at: null,
  activated_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ai_sensitive_data_enabled: false,
  ai_disable_sensitive_tools: false,
};

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@wattleos.com',
  first_name: 'Demo',
  last_name: 'Admin',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const DEMO_ROLE: Role = {
  id: '00000000-0000-0000-0000-000000000002',
  tenant_id: DEMO_TENANT.id,
  name: 'Owner',
  description: 'Demo admin role with all permissions',
  is_system: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Grant every permission so the viewer can navigate everywhere
const ALL_PERMISSIONS = Object.values(Permissions);

export const DEMO_CONTEXT: TenantContext = {
  tenant: DEMO_TENANT,
  user: DEMO_USER,
  role: DEMO_ROLE,
  permissions: ALL_PERMISSIONS,
};
