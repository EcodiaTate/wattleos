# WattleOS V2 — Data Import / Migration Tool

## What This Is
A universal CSV importer that lets admins migrate data from **any** school management platform (Transparent Classroom, Storypark, FACTS SIS, Xplor, or manual spreadsheets) into WattleOS via a guided step-by-step wizard.

## Architecture Decision: Why a Column Mapper Instead of Per-Platform Parsers
Every platform exports differently, and they change their formats without notice. Rather than maintaining brittle per-platform parsers, we build a **universal column mapper** (the same pattern used by Mailchimp, HubSpot, and Airtable). The admin uploads any CSV, maps their columns to WattleOS fields, previews + validates, then imports. This works for every source forever.

## File Placement

```
src/
├── app/(app)/admin/data-import/
│   ├── page.tsx                      ← Server component (auth + history fetch)
│   └── import-wizard-client.tsx      ← Client component (wizard UI)
│
├── lib/data-import/
│   ├── types.ts                      ← All TypeScript types + field definitions
│   ├── csv-parser.ts                 ← Client-side CSV parsing + column suggestions
│   ├── validators.ts                 ← Server-side validation logic
│   └── actions.ts                    ← Server actions (validate, import, rollback)
│
supabase/migrations/
└── YYYYMMDD_import_jobs.up.sql       ← Migration for import_jobs + import_job_records tables
```

## Import Order (Tell Your Admins This)
1. **Students** — Import first. Everything else references students by name.
2. **Guardians** — Links parents to students. Requires students to exist.
3. **Emergency Contacts** — Links contacts to students.
4. **Medical Conditions** — Links conditions to students.
5. **Staff** — Independent. Can be imported at any time.

## The Import Flow
1. **Select Type** — Pick what you're importing (students, guardians, etc.)
2. **Upload CSV** — Drag-and-drop or browse. Parsed in-browser (no upload to server).
3. **Map Columns** — Auto-detects common column names from TC/Storypark/FACTS. Admin confirms or adjusts.
4. **Preview & Validate** — Server-side check: required fields, date formats, duplicates, FK references.
5. **Import** — Inserts valid rows. Tracks every row's outcome for audit.
6. **Results** — Summary with rollback option.

## Smart Column Detection
The mapper recognizes 100+ common CSV column names across platforms:
- `"Child First Name"`, `"first_name"`, `"Given Name"` → all map to `first_name`
- `"DOB"`, `"Date of Birth"`, `"Birthday"` → all map to `dob`
- `"Classroom"`, `"Room"`, `"Environment"`, `"Level"` → all map to `class_name`
- Supports Australian date formats (DD/MM/YYYY) and US (MM/DD/YYYY)
- Normalizes gender synonyms (M/F/Boy/Girl → male/female)
- Normalizes relationship synonyms (Mum/Mom/Dad → mother/father)

## Rollback
Every import tracks which records were created. Admins can "Undo Import" from the results page or the import history table, which soft-deletes all created records.

## Database Tables Added
- `import_jobs` — Tracks each import attempt with status, counts, and error details
- `import_job_records` — Per-row audit trail with entity_id for rollback

Both tables have RLS policies requiring `manage_students` permission.

## Known Limitations / Future Work
- **Guardian import** requires parent user accounts to already exist (Supabase auth.users can't be created from server actions without admin API). The current flow flags these and suggests using the invitation flow.
- **Staff import** similarly requires existing user accounts or uses the invite flow.
- **Photo import** not supported (students only get basic demographics).
- **Attendance history import** not yet built — add as a future import type.
- Maximum 5,000 rows per file (browser memory constraint).
- No progress bar during import (could add via realtime subscription on import_job status).

## How to Add a New Import Type
1. Add the type to the `ImportType` union in `types.ts`
2. Define field definitions in `types.ts` (add to `IMPORT_FIELD_REGISTRY`)
3. Add aliases for column detection in `csv-parser.ts` → `FIELD_ALIASES`
4. Add validation logic in `validators.ts` → the main `switch` block
5. Add insertion logic in `actions.ts` → the `insertRow` function
6. Add UI metadata in `import-wizard-client.tsx` → `IMPORT_TYPE_INFO`
