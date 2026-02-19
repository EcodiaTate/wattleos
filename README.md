# WattleOS V2

Montessori-native school operating system.

## Setup

### Prerequisites

- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- A Supabase project (create at [supabase.com](https://supabase.com))

### 1. Clone and install

```bash
cd wattleos-v2
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL, anon key, and service role key from the Supabase dashboard (Settings > API).

### 3. Database setup

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run the foundation migration
supabase db push

# Seed permissions
# Copy the contents of supabase/seed/permissions.sql and run in the Supabase SQL Editor
```

### 4. Configure Google OAuth

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google
3. Add your Google OAuth client ID and secret
4. Set the redirect URL to: `http://localhost:3000/auth/callback`

### 5. Create your first tenant

Run this in the Supabase SQL Editor:

```sql
-- Create a test tenant
INSERT INTO tenants (slug, name, timezone)
VALUES ('demo-school', 'Demo Montessori School', 'Australia/Sydney');
```

After signing in with Google, you'll need to manually create a `tenant_users` row linking your user to this tenant. The system roles are auto-seeded by the `on_tenant_created` trigger.

```sql
-- Find your user ID (after first Google sign-in)
SELECT id, email FROM users;

-- Find the Owner role for your tenant
SELECT r.id as role_id, t.id as tenant_id
FROM roles r
JOIN tenants t ON t.id = r.tenant_id
WHERE t.slug = 'demo-school' AND r.name = 'Owner';

-- Link yourself as Owner
INSERT INTO tenant_users (tenant_id, user_id, role_id)
VALUES ('your-tenant-id', 'your-user-id', 'your-owner-role-id');

-- Set your JWT to include the tenant
-- (This is normally done by the auth callback, but for initial setup:)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"tenant_id": "your-tenant-id"}'::jsonb
WHERE id = 'your-user-id';
```

### 6. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`. You should be redirected to the Google login, then to the dashboard.

## Project Structure

```
src/
  app/
    (auth)/        # Login, OAuth callback, tenant picker
    (app)/         # Authenticated tenant-scoped routes
      dashboard/   # Main dashboard
      pedagogy/    # Observations, curriculum, mastery (Module 2-4)
      students/    # Student profiles, medical (Module 5)
      attendance/  # Daily attendance (Module 6)
      reports/     # Term reports (Module 7)
      admin/       # Settings, roles, integrations
  components/
    ui/            # shadcn/ui primitives
    domain/        # WattleOS-specific components
  lib/
    supabase/      # DB clients (server, browser, admin, middleware)
    actions/       # Server Actions by domain
    auth/          # Tenant context, permission checks
    constants/     # Permission keys, enums
  types/
    domain.ts      # Canonical domain types
    api.ts         # Response wrappers
```

## Build Phases

- [x] Module 1: Core Platform & Identity
- [ ] Module 2: Curriculum Engine
- [ ] Module 3: Observation Engine
- [ ] Module 4: Mastery & Portfolios
- [ ] Module 5: Student Information System
- [ ] Module 6: Attendance & Safety
- [ ] Module 7: Reporting & Communications
- [ ] Module 8: Integration Pipes
