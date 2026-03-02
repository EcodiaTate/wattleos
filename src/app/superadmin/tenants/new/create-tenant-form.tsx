'use client';

// src/app/(superadmin)/tenants/new/create-tenant-form.tsx
//
// ============================================================
// WattleOS V2 - Super Admin: Create Tenant Form
// ============================================================
// Calls createTenant() server action. On success shows the
// generated setup URL so the platform team can send it to the
// school's primary contact.
// ============================================================

import { createTenant } from '@/lib/actions/superadmin/tenants';
import { useState, useTransition } from 'react';

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
];

const PLAN_TIERS = [
  { value: 'basic',      label: 'Basic' },
  { value: 'pro',        label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function CreateTenantForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tenant_id: string;
    setup_url: string;
  } | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [copied, setCopied] = useState(false);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setSlugValue(slugify(name));
  }

  function handleAction(formData: FormData) {
    formData.set('slug', slugValue);
    setError(null);
    startTransition(async () => {
      const res = await createTenant(formData);
      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        setResult({ tenant_id: res.data.tenant_id, setup_url: res.data.setup_url });
      }
    });
  }

  async function handleCopy() {
    if (!result?.setup_url) return;
    await navigator.clipboard.writeText(result.setup_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success state ──────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">✓</span>
            <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              School provisioned
            </h2>
          </div>

          <p className="mb-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Send this setup link to the school's primary contact. It's valid for 72 hours and
            single-use. They'll click it, sign in with Google, and land in their dashboard as Owner.
          </p>

          <div
            className="flex items-center gap-2 rounded-lg border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
          >
            <code
              className="flex-1 overflow-x-auto text-xs"
              style={{ color: 'var(--foreground)' }}
            >
              {result.setup_url}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Need to generate a new link later? Go to the tenant detail page.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={`/superadmin/tenants/${result.tenant_id}`}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            View Tenant →
          </a>
          <button
            onClick={() => { setResult(null); setSlugValue(''); }}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            Provision Another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <form action={handleAction} className="space-y-5">
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--destructive)',
            background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            color: 'var(--destructive)',
          }}
        >
          {error}
        </div>
      )}

      {/* School Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          School Name
        </label>
        <input
          name="name"
          required
          placeholder="Sunrise Montessori School"
          onChange={handleNameChange}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* Slug (auto-generated, editable) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Slug
          <span className="ml-1 font-normal" style={{ color: 'var(--muted-foreground)' }}>
            (subdomain, lowercase alphanumeric + hyphens)
          </span>
        </label>
        <div className="flex items-center gap-0">
          <span
            className="rounded-l-lg border border-r-0 px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--muted)',
              color: 'var(--muted-foreground)',
            }}
          >
            app.wattleos.au/
          </span>
          <input
            name="slug"
            required
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="sunrise-montessori"
            className="flex-1 rounded-r-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          />
        </div>
      </div>

      {/* Owner Email */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Owner Email
          <span className="ml-1 font-normal" style={{ color: 'var(--muted-foreground)' }}>
            (setup link will be scoped to this address)
          </span>
        </label>
        <input
          name="owner_email"
          type="email"
          required
          placeholder="principal@sunrisemontessori.edu.au"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* Plan + Timezone in a row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Plan
          </label>
          <select
            name="plan_tier"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            {PLAN_TIERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Timezone
          </label>
          <select
            name="timezone"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('Australia/', '').replace('Pacific/', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Country + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Country
          </label>
          <select
            name="country"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
          </select>
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Currency
          </label>
          <select
            name="currency"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
            }}
          >
            <option value="AUD">AUD</option>
            <option value="NZD">NZD</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || !slugValue}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {isPending ? 'Provisioning…' : 'Provision School + Generate Setup Link'}
        </button>
      </div>
    </form>
  );
}
