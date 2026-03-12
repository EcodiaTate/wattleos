# WattleOS - Product-Led Growth Strategy

**Purpose:** Isolatable free modules that deliver standalone value, accumulate switching-cost data, and expose natural upsells.

---

## Strategic Overview

**Core Insight:** Schools buy solutions to immediate pain points championed by one person. Free modules sized for a single staff member create entry points with zero friction. Their data accumulates. Colleagues notice. Upgrade conversations happen naturally.

**Three Laws of an Isolatable Module:**
1. Zero dependency on other modules to deliver core value
2. Data accumulation creates genuine switching cost
3. At least one natural upsell trigger exists within core workflow

**Milestone-Triggered Expansion:** Contextual nudges appear when user behaviour signals they've outgrown the free tier - never generic "upgrade now" banners, always specific and data-driven.

---

## Entry Point Map

| Module | Target | Entry Point | Upsell Wall |
|---|---|---|---|
| **A: Term Reports** | Systems Coordinator | Template builder + guide narrative | Parent portal, auto-populated fields |
| **B: Observations** | Classroom Guide | iPad-optimised capture + curriculum tagging | Colleague visibility, mastery sync, parent access |
| **C: Curriculum** | Curriculum Lead | Pre-loaded AMI/EYLF tree + mastery tracker | Class heatmap, EYLF compliance reports |
| **D: Admissions** | Registrar | Waitlist + pipeline + tour booking | Offer → enrollment (architectural wall) |

---

## Module A: Term Report Builder

**Target:** Systems coordinator / Head of School | **Pain:** Crystal Reports charges, Word doc workflows
**Standalone:** Yes - works without other modules

**Problem:** Guides fill reports manually (Word docs), office staff compiles/formats, process takes weeks.
**Solution:** Visual template builder, guide fills in-browser with autosave, office reviews from dashboard, PDFs auto-generate.

### Data Model

```sql
CREATE TABLE report_periods (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, name TEXT,
  academic_year INTEGER, term TEXT, opens_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ, closes_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('draft','active','closed','archived')),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE report_templates (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, report_period_id UUID REFERENCES report_periods(id),
  name TEXT, cycle_level TEXT, sections JSONB DEFAULT '[]',
  page_settings JSONB DEFAULT '{}', version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ
);
-- sections JSONB: { id, type ('locked_text'|'merge_field'|'guide_narrative'|'mastery_summary'|'observation_highlights'),
-- label, placeholder, required, min_words, max_words, content, merge_key, paid_tier, sequence_order }

CREATE TABLE report_instances (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL,
  template_id UUID REFERENCES report_templates(id), report_period_id UUID REFERENCES report_periods(id),
  student_id UUID REFERENCES students(id), student_first_name TEXT, student_last_name TEXT,
  student_preferred_name TEXT, class_name TEXT,
  assigned_guide_id UUID REFERENCES users(id), assigned_guide_name TEXT,
  section_responses JSONB DEFAULT '[]', -- [{ section_id, content, word_count, last_edited_at }]
  status TEXT CHECK (status IN ('not_started','in_progress','submitted','changes_requested','approved','published')),
  submitted_at TIMESTAMPTZ, submitted_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ, reviewed_by UUID REFERENCES users(id),
  change_request_notes TEXT, approved_at TIMESTAMPTZ, approved_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ, pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, template_id, report_period_id, student_first_name, student_last_name)
);
```

### RLS Policies
```sql
CREATE POLICY "Admins manage templates" ON report_templates FOR ALL USING (tenant_id = current_tenant_id() AND has_permission('manage_reports'));
CREATE POLICY "Guides read templates" ON report_templates FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "Guides manage own instances" ON report_instances FOR ALL USING (tenant_id = current_tenant_id() AND assigned_guide_id = auth.uid());
CREATE POLICY "Admins manage all instances" ON report_instances FOR ALL USING (tenant_id = current_tenant_id() AND has_permission('manage_reports'));
```

### Free vs Paid Tier

| Feature | Free | Paid |
|---|---|---|
| Template builder | ✅ | ✅ |
| locked_text, guide_narrative sections | ✅ | ✅ |
| mastery_summary, observation_highlights | ❌ Locked | ✅ Auto-pop |
| Merge fields (student, class, term) | ✅ Manual | ✅ Auto SIS |
| Merge fields (attendance, mastery) | ❌ Locked | ✅ |
| PDF export | ✅ | ✅ |
| Parent portal delivery | ❌ | ✅ |
| Report history | Last 1 term | Unlimited |

### Routes & Components

| Page | Route | Role |
|---|---|---|
| Periods List | `/reports` | Admin |
| Template Builder | `/reports/templates/[id]/edit` | Admin |
| Progress Dashboard | `/reports/periods/[id]/dashboard` | Admin |
| Report Review | `/reports/instances/[id]/review` | Admin |
| My Reports | `/reports/my-reports` | Guide |
| Report Editor | `/reports/instances/[id]/edit` | Guide |

**Key Components:** `SectionEditor`, `SectionBlock`, `MergeFieldPicker`, `ReportInstanceEditor`, `ProgressGrid`, `StatusBadge`, `ChangeRequestPanel`, `PDFPreview`

### Upsell Moments

- **In template builder:** When adding `mastery_summary` section → "Auto-populates from curriculum tracking. Connect the Curriculum & Mastery module."
- **In guide editor (after 5th narrative):** "You've written this 5 times. With curriculum tracking connected, WattleOS writes it automatically."
- **In admin dashboard (period end):** "Reports ready. 23 parents are waiting. Deliver through parent portal instead of printing."

### Server Actions

```typescript
createReportTemplate() | updateReportTemplate() | deleteReportTemplate() | duplicateReportTemplate()
createReportPeriod() | activateReportPeriod() // Generates all instances
generateReportInstances() | approveReportInstance() | requestChanges() | generatePDF() | bulkExportPDFs()
saveReportDraft() | submitReport()
```

---

## Module B: Observation Capture

**Target:** Classroom Guide | **Pain:** Paper notes, Google Forms, Transparent Classroom data residency issues
**Standalone:** Yes - one guide, one class, no SIS/curriculum dependencies

**Problem:** Guides observe constantly but notes stay scattered (sticky notes, Apple Notes, Google Sheets). No outcome linking, never reaches parents.
**Solution:** Mobile-first iPad capture with optional curriculum tagging, draft/publish workflow, photo attachments, fast submit.

### Data Model

Uses existing `observations`, `observation_students`, `observation_outcomes`, `observation_media` tables.

**Free-tier addition:**
```sql
CREATE TABLE observation_freeform_tags (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
  tag_text TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_obs_freeform_tenant ON observation_freeform_tags (tenant_id, observation_id);
ALTER TABLE observation_freeform_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON observation_freeform_tags FOR ALL USING (tenant_id = current_tenant_id());
```

### Free vs Paid Tier

| Feature | Free | Paid |
|---|---|---|
| Create observations | ✅ Unlimited | ✅ |
| Photo attachments | ✅ 5 max | ✅ Unlimited + video |
| Student tagging | ✅ Manual name | ✅ From SIS list |
| Outcome tagging | ✅ Freeform text | ✅ Structured AMI/EYLF |
| Draft/publish | ✅ | ✅ |
| Own observation feed | ✅ | ✅ |
| View colleagues' obs | ❌ | ✅ |
| Parent portal | ❌ | ✅ |
| Auto-update mastery | ❌ | ✅ |
| Pull into reports | ❌ | ✅ |
| Export as PDF/CSV | ✅ | ✅ |

**Why export is free:** Easy export reduces lock-in anxiety. The real switching cost is the *graph* - observation linked to curriculum linked to mastery linked to portfolio. That graph only exists in WattleOS.

### Upsell Moments

- **After 10 observations:** "Only you can see them, not linked to curriculum. Connect the Curriculum module to tag to AMI outcomes automatically."
- **When typing structured outcome:** "Select from pre-loaded curriculum tree instead of typing each time."
- **After 1 term:** "47 observations captured. Parents can't see this. Connect Parent Portal to publish directly to their app."
- **When second guide joins:** "Another guide at your school joined. On free tier, you can't see each other's observations. Upgrade to work from same platform."

---

## Module C: Curriculum & Mastery Tracker

**Target:** Curriculum Coordinator / Lead Guide | **Pain:** Curriculum in printed albums/binders/Google Sheets, no tracking
**Standalone:** Yes - one person tracks mastery without any other module

**Problem:** Curriculum almost never in digital system that can be queried/filtered/reported on.
**Solution:** Pre-loaded AMI/EYLF curriculum templates (schools fork and customise), track mastery per student per outcome (not_started → presented → practicing → mastered).

**Competitive moat:** Pre-loaded curriculum data. A school forking the AMI 3–6 template gets weeks of data entry done for them on signup. This data accumulates and becomes irreplaceable.

### Free vs Paid Tier

| Feature | Free | Paid |
|---|---|---|
| Fork AMI/EYLF template | ✅ | ✅ |
| Customize curriculum tree | ✅ | ✅ |
| Track mastery (up to 30 students) | ✅ | ✅ Unlimited |
| Individual student mastery view | ✅ | ✅ |
| Class mastery heatmap | ❌ | ✅ |
| EYLF cross-mapping / compliance | ❌ | ✅ |
| Link mastery to observations | ❌ | ✅ |
| Pull mastery into reports | ❌ | ✅ |
| Multiple curriculum instances | 1 | Unlimited |

### Upsell Moments

- **After full class tracked:** "Mapped mastery for all 24 students. Class heatmap would show which outcomes nobody's been presented yet."
- **When EYLF mapping visible/locked:** "Each outcome maps to EYLF for compliance. Connect framework to auto-generate evidence portfolio."
- **After 1 term:** "Curriculum data not connected to daily observations. When guide records observation and tags outcome, mastery should update automatically."

---

## Module D: Admissions Pipeline

**Target:** Registrar / Office Admin | **Pain:** Waitlists in spreadsheets, inquiries lost in email, no tour booking
**Standalone:** Yes - entire pipeline from inquiry to offer works independently
**Special:** **Hard architectural wall** at offer → enrollment. Upsell is built into core workflow.

**Problem:** Multi-year waitlists managed in spreadsheets, inquiries scattered in email, tours booked manually.
**Solution:** Online inquiry form, kanban pipeline board, tour slot management, automated stage-triggered emails.

**The Hard Wall:**
```
Family accepts offer
  → Registrar clicks "Convert to Enrollment"
  → Modal: "To complete enrollment, WattleOS needs student record,
             guardian accounts, billing. Requires full platform.
             Everything pre-filled. Upgrade to complete in one click."
  → [Upgrade to Full Platform] [Export data and complete manually]
```

The export option demonstrates confidence - schools that click it see manual work required and often return.

### Routes
- Public inquiry form at `{school}.wattleos.au/inquiry` (no auth, embeddable iframe)
- Registrar pipeline at `/admissions` with kanban board, tour slots, stage emails
- Conversion wall at offer acceptance triggers upgrade modal

---

## The Champion Mechanic

**Automatic Head of School Notification:**
When 2+ guides from same school use free tier:
> "Two guides are using WattleOS. Here's what they've built: [X observations], [Y outcomes tracked], [Z reports]. Currently isolated - their data doesn't connect. Upgrade to bring it all together."

Data-driven, not spammy. Surfaces product to budget holder.

**Year in Review:**
End of academic year → auto-generated summary to HoS:
- Observations captured
- Curriculum outcomes tracked
- Reports generated
- Hours saved (estimated)
- What would've been automatic with full platform

**Embedded Form as Marketing:**
Every school embeds inquiry form on own website → "Powered by WattleOS" footer → passive, zero-cost marketing.

---

## Build Sequencing (for first deployment)

**1. Module A (Term Reports)** - Entry point for your mum's school. Pain is acute (Crystal Reports), decision-maker motivated (principal), champion sold (systems coordinator).

**2. Module C (Curriculum)** - After reports running, natural question: "Can mastery auto-populate report?" Mastery summary sections auto-fill. First ecosystem moment.

**3. Module B (Observations)** - Observations connect to both curriculum and reports. Full workflow: observe → tag outcome → mastery updates → report auto-fills. Conversion moment.

**4. Module D (Admissions)** - Separate buyer, separate workflow. Build once A–C proven with at least one school.

---

## Technical Notes (All Modules)

**Stack:** Next.js 15 App Router, Supabase, TypeScript strict, Tailwind v4, shadcn/ui

**Middleware:** Use `proxy.ts` - NOT `middleware.ts`. Do not rename.

**Server-first:** Default Server Components. Use `'use client'` only for immediate interactivity (forms, real-time, drag-and-drop).

**Actions pattern:** All Server Actions return `{ data: T | null, error: string | null }`. Never throw. Never fail silently.

**Multi-tenancy:** Every query filters by `tenant_id`. Every mutation validates `current_tenant_id()`. RLS is safety net, not primary enforcement.

**Feature package:** Per module: `up.sql` migration, RLS policies, TypeScript interfaces, Server Actions, UI components.

**Free tier enforcement:** Limits enforced at Server Action layer (not RLS). RLS enforces tenant isolation. Plan logic in one place.

**Design system:** Warm amber + eucalyptus green. shadcn/ui base. Professional for admins, approachable for guides.
