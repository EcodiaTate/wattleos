'use client';

// src/app/(superadmin)/tenants/[id]/generate-token-form.tsx

import type { generateSetupToken } from '@/lib/actions/superadmin/tenants';
import { useState, useTransition } from 'react';

interface Props {
  tenantId: string;
  action: typeof generateSetupToken;
}

export function GenerateTokenForm({ tenantId, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<{ setup_url: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleAction(formData: FormData) {
    formData.set('tenant_id', tenantId);
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        setResult({ setup_url: res.data.setup_url, expires_at: res.data.expires_at });
      }
    });
  }

  async function handleCopy() {
    if (!result?.setup_url) return;
    await navigator.clipboard.writeText(result.setup_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-3">
        <div
          className="flex items-center gap-2 rounded-lg border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          <code className="flex-1 overflow-x-auto text-xs" style={{ color: 'var(--foreground)' }}>
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
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Expires {new Date(result.expires_at).toLocaleString('en-AU')}
        </p>
        <button
          onClick={() => setResult(null)}
          className="text-xs hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Generate another
        </button>
      </div>
    );
  }

  return (
    <form action={handleAction} className="flex items-end gap-3">
      {error && (
        <p className="text-xs" style={{ color: 'var(--destructive)' }}>
          {error}
        </p>
      )}
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--foreground)' }}>
          Email address
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="owner@school.edu.au"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        {isPending ? 'Generating…' : 'Generate Link'}
      </button>
    </form>
  );
}
