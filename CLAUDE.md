# WattleOS - Claude Code Instructions

## Project Context

WattleOS is a multi-tenant Montessori school operating system.

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Supabase** (PostgreSQL + RLS, cookie-based SSR auth)
- **TypeScript 5** - generated types (`src/types/supabase.ts`) + domain types (`src/types/domain.ts`)
- **Tailwind CSS 4 + Shadcn/ui**
- **Upstash Redis** for rate limiting and caching
- **Capacitor 8** for iOS/Android native shell
- **Anthropic Claude** ("Ask Wattle" AI assistant), Stripe, Google Drive, Xero

Current phase: **polishing and feature completion.** Architecture, migrations, and RLS are in place. Do not re-scaffold or re-migrate unless explicitly asked.

---

## Architecture
- **Rendering:** Server Components by default, `'use client'` for interactivity only, Server Actions for mutations
- **Actions:** Return `{ data: T | null, error: string | null }` via `success()`/`failure()`, never throw
- **Permissions:** `requirePermission()` at top of every action; RLS is safety net
- **New features:** migration + RLS policy (`current_tenant_id()`) + domain type
- **Structure:** group by domain (not type), `/app/(app)/`, `/components/{domain,ui}/`, `/lib/{actions,auth,integrations,validations,utils}/`, `/types/`
- **Performance:** `cache()` per-request dedup, Upstash Redis for slow data, explicit columns, `useOptimistic`, always show pending
- **Ask Wattle:** tools in `/api/ask-wattle/`, match `ask-wattle.ts` types, confirmation before destructive
- **Robustness:** Zod validation, audit-log sensitive mutations, soft-delete (never hard)

## Built Modules (Do Not Rebuild)
- **E:** QIP - NQS assessment, goals, evidence, PDF
- **F:** Immunisation - IHS, state rules, support
- **G:** CCS - bundles, absence cap, CSV
- **H:** Excursions - risk, consent, headcount
- **I:** Complaints/Policies - Reg 168, register
- **J:** Lessons - work cycles, progress, EYLF
- **K:** MQ:AP - 27 criteria, NQS alignment
- **L:** Ask Wattle - ~35 tools (draft, suggest, compliance)
- **M:** Emergency Coordination - zones, accountability, realtime
- **N:** Rostering - templates, shifts, leave, swaps, coverage
- **Q:** ILPs - goals, strategies, reviews, transitions
- **-:** Emergency Drills - Reg 97, monthly, execution
- **15:** Staff - profiles, compliance, roles, permissions

## TODO Modules

| Module | Regulation | Urgency | Build |
|--------|-----------|---------|-------|
| **A** | Incident Register | Reg 87, QA2.2 | CRITICAL: Form (date/location/type/witnesses), severity classifier (24h timer), parent notification + tracker, incident register, audit log, Ask Wattle tool |
| **B** | Medications | Reg 93–94, QA2.1 | CRITICAL: Medical plans (ASCIA/asthma/diabetes), authorization, admin record per dose, alerts (arrival/expiry @30d), Ask Wattle tool |
| **C** | Staff Compliance | Reg 136–138, QA4.1 | CRITICAL **[27 Feb 2026]**: WWCC, qualifications, First Aid/CPR/Anaphylaxis/Asthma (Geccko), dashboard, NQA ITS export, expiry alerts, Ask Wattle tool |
| **D** | Ratio Monitoring | Reg 123, QA4.1 | Educator on-floor toggle, real-time display (children vs educators), age-based ratio engine (0–24m 1:4, 24–36m 1:5, 3+ 1:11, OSHC 1:15), breach alerts, historical log |
| **O** | Daily Care Log | Reg 162 | MEDIUM: Per-child timestamped entries (nappy/sleep/meal/sunscreen), mobile quick-entry, parent summary, room-configurable |
| **P** | Conferences | - | LOW-MED: Slot management, parent booking, reminders (48h/24h/1h), notes, reschedule/cancel |

## Regulatory Deadlines
- **27 Feb 2026 [NOW]:** NQA ITS export + Geccko training (Mod C)
- 1 Jan 2026: NQS revised (Mod E - done)
- July 2026: Geccko advanced modules (Mod C)
- 2026 (pilot): AMI accreditation monitor (Mod K)
