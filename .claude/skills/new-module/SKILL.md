---
name: new-module
description: Scaffold a new WattleOS compliance module. Use when asked to build a new module, feature area, or compliance domain. Provides the authoritative 10-step checklist and conventions to follow.
---

# WattleOS New Module Checklist

You are building a new compliance module for WattleOS. Follow these steps in order. Complete each fully before moving to the next. Confirm with the user after each step if the module is non-trivial.

## Step 0 - Clarify scope before starting
Ask the user:
- Module name (used for file naming, e.g. `incident-reports`)
- DB table name(s)
- Which sidebar group (Operations / Compliance / Pedagogy / Admin)
- Permissions needed (e.g. `VIEW_X`, `MANAGE_X`)
- Whether an Ask Wattle tool is needed

---

## Step 1 - Migration

File: `supabase/migrations/000XX_<module_name>.sql`

Find the next migration number: check the latest file in `supabase/migrations/` and increment.

Pattern:
```sql
-- 000XX_<module_name>.sql
CREATE TYPE <enum_name> AS ENUM (...);

CREATE TABLE <table_name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ... domain columns
);

-- RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table_name>_tenant_isolation" ON <table_name>
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- Indexes
CREATE INDEX ON <table_name> (tenant_id);
CREATE INDEX ON <table_name> (tenant_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_<table_name>_updated_at
  BEFORE UPDATE ON <table_name>
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 2 - Domain Types

File: `src/types/domain.ts`

Add to the bottom of the file (find the `// ============================================================` section pattern):

```typescript
// ============================================================
// <MODULE NAME>
// ============================================================

export type <StatusEnum> = 'value1' | 'value2' | 'value3';

export interface <Entity> {
  id: string;
  tenant_id: string;
  // ... fields matching DB columns exactly (snake_case)
  created_at: string;
  updated_at: string;
}

export interface <EntityWithRelations> extends <Entity> {
  // joined data
}

export interface <DashboardData> {
  // aggregated stats for dashboard page
}
```

Rules:
- Use `string` for dates (Supabase returns ISO strings)
- Use `string` for UUIDs
- Use `dob` not `date_of_birth` for student DOB
- Match DB column names exactly (snake_case)

---

## Step 3 - Validation Schemas

File: `src/lib/validations/<module>.ts`

```typescript
import { z } from "zod";

export const create<Entity>Schema = z.object({
  tenant_id: z.string().uuid(),
  // ... required fields
});

export const update<Entity>Schema = create<Entity>Schema.partial().extend({
  id: z.string().uuid(),
});

export const list<Entity>FilterSchema = z.object({
  tenant_id: z.string().uuid(),
  // ... optional filters
}).partial();

// Use z.input<typeof schema> for filter types (not z.infer)
export type Create<Entity>Input = z.infer<typeof create<Entity>Schema>;
export type Update<Entity>Input = z.infer<typeof update<Entity>Schema>;
export type List<Entity>Filter = z.input<typeof list<Entity>FilterSchema>;
```

Rules:
- Use `z.input<>` for filter types (handles optional fields correctly)
- Use `|| null` not `|| undefined` when building Zod-typed params
- Zod error access: `.issues[0]` not `.errors[0]`

---

## Step 4 - Server Actions

File: `src/lib/actions/<module>.ts`

```typescript
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getTenantContext } from "@/lib/auth/tenant";
import { ActionResponse, ErrorCodes } from "@/types/actions";
import { recordAuditEvent } from "@/lib/utils/audit";
import type { <Entity>, <DashboardData> } from "@/types/domain";

export async function get<Entity>Dashboard(): Promise<ActionResponse<<DashboardData>>> {
  try {
    const { tenantId } = await getTenantContext();
    await requirePermission("VIEW_<MODULE>");
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("<table>")
      .select("*")
      .eq("tenant_id", tenantId);

    if (error) return { error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } };

    return { data: { /* mapped dashboard data */ } };
  } catch (e) {
    return { error: { code: ErrorCodes.UNAUTHORIZED, message: "Unauthorized" } };
  }
}
```

Rules:
- `ErrorCodes.DATABASE_ERROR` not `QUERY_FAILED` (latter doesn't exist)
- `ErrorCodes.ALREADY_EXISTS` not `CONFLICT`
- Check `result.error` for failure (not `!result.ok`)
- Supabase joins return arrays - use `arr[0]` not direct cast
- Always `"use server"` at top
- Always `requirePermission` before any DB query

Implement: CRUD + dashboard + list + export (CSV if needed)

---

## Step 5 - CSS Tokens

File: `src/app/globals.css`

Find the `:root {` and `.dark {` blocks. Add tokens grouped together:

```css
/* <Module Name> */
--<module>-<status1>: <light-color>;
--<module>-<status1>-fg: <light-text-color>;
--<module>-<status1>-bg: <light-bg-color>;
--<module>-<status2>: <light-color>;
/* ... */
```

And matching dark mode variants in `.dark { }`.

Status token naming: `--<module>-<status>` (border/accent), `--<module>-<status>-fg` (text), `--<module>-<status>-bg` (background).

Rules:
- NEVER use hardcoded `bg-red-100`, `text-green-700` etc in components - always use these tokens
- Use `style={{ color: "var(--token)" }}` or `style={{ backgroundColor: "var(--token)" }}`

---

## Step 6 - Audit Actions

File: `src/lib/utils/audit.ts`

Find the `AuditAction` union type. Add new entries:

```typescript
| "<MODULE>_CREATED"
| "<MODULE>_UPDATED"
| "<MODULE>_DELETED"
// ... others as needed
```

Sensitivity levels: `"low"` | `"medium"` | `"high"` | `"critical"`
- CRUD → `"medium"`
- Exports → `"low"`
- Activation/emergency/billing → `"critical"`

---

## Step 7 - Routes

Create pages using Next.js App Router conventions under `src/app/(app)/`:

```
src/app/(app)/<group>/<module>/
  page.tsx          ← dashboard (server component, fetches data, renders client)
  new/page.tsx      ← create form
  [id]/page.tsx     ← detail view
  [id]/edit/page.tsx ← edit form
```

Page pattern (server component):
```typescript
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/auth/permissions";
import { get<Entity>Dashboard } from "@/lib/actions/<module>";
import { <DashboardClient> } from "@/components/domain/<module>/<dashboard-client>";

export default async function <Module>Page() {
  const perms = await getPermissions();
  if (!perms.includes("VIEW_<MODULE>")) redirect("/");

  const result = await get<Entity>Dashboard();
  if (result.error) {
    return <div>Error loading data</div>;
  }

  return <DashboardClient data={result.data} permissions={perms} />;
}
```

---

## Step 8 - Components

Directory: `src/components/domain/<module>/`

Standard component set:
- `<module>-status-badge.tsx` - displays status with CSS token colors
- `<module>-dashboard-client.tsx` - main dashboard "use client" component
- `<module>-form.tsx` - create/edit form with haptics
- `<module>-list-client.tsx` - filterable list

Component rules:
- `"use client"` at top of interactive components
- `const haptics = useHaptics()` - medium for confirmations, heavy for publish/submit, light for nav/toggle
- Touch targets: `active-push touch-target` classes (44px min)
- Cards: `card-interactive` class
- Borders: `border border-border` (NOT `borderborder-border`)
- Scrollable containers: `scroll-native` class
- Empty states: `style={{ color: "var(--empty-state-icon)" }}`
- CSS vars for all colors, NEVER hardcoded tailwind color classes

---

## Step 9 - Sidebar Entry

File: `src/components/domain/sidebar.tsx`

Find the appropriate group array (Operations / Compliance / Pedagogy / Admin). Add:

```typescript
{
  name: "<Display Name>",
  href: "/<group>/<module>",
  icon: <IconName>, // from lucide-react
  permission: "VIEW_<MODULE>",
},
```

---

## Step 10 - Permissions

File: `src/lib/constants/permissions.ts` (or wherever Permissions are defined)

Add:
```typescript
VIEW_<MODULE> = "view_<module>",
MANAGE_<MODULE> = "manage_<module>",
```

Update default role assignments: Owners + Admins get `MANAGE_<MODULE>`, Educators get `VIEW_<MODULE>`.

---

## Step 11 - Ask Wattle Tool (if needed)

Files: `src/lib/docs/wattle-tools.ts` + handler file

Add to TOOL_REGISTRY:
```typescript
{
  name: "get_<module>_summary",
  description: "...",
  parameters: {
    type: "object",
    properties: {
      tenant_id: { type: "string" }
    },
    required: ["tenant_id"]
  },
  requiredPermission: Permissions.VIEW_<MODULE>,
}
```

Add handler function and register in the dispatcher switch.

---

## Final Checklist

Before calling the module done:
- [ ] Migration file created with correct number prefix
- [ ] Domain types in `domain.ts`
- [ ] Validation schemas with correct Zod patterns
- [ ] Server actions with `requirePermission` + audit logging
- [ ] CSS tokens in `globals.css` (light + dark)
- [ ] Audit actions in `audit.ts`
- [ ] Routes created (dashboard + CRUD)
- [ ] Components with haptics + CSS vars
- [ ] Sidebar entry added
- [ ] Permissions defined and assigned to roles
- [ ] Ask Wattle tool (if requested)
- [ ] Run `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` - zero errors
