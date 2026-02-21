# Module 14 Content Library — Audit Fix Package

## Change Summary

| # | File | Action | What Changed |
|---|------|--------|--------------|
| 1 | `content-library/layout.tsx` | **REPLACE** | Added permission-gated "Import" tab, "Your Curricula" back-link |
| 2 | `content-library/page.tsx` | **REPLACE** | Added "Import Template" button for admins, improved empty state |
| 3 | `content-library/materials/page.tsx` | **REPLACE** | **BUG FIX**: Removed `window.location` usage in Server Component. Passes `queryLower` as prop instead |
| 4 | `content-library/compliance/page.tsx` | **REPLACE** | Removed unused `selectedTemplate` variable, removed unused `tenant` param from `EvidenceRow` |
| 5 | `content-library/template/[templateId]/page.tsx` | **REPLACE** | **BUG FIX**: Cross-mapping link now uses `?source=` instead of `?template=` |
| 6 | `content-library/node/[nodeId]/page.tsx` | **NEW** | Enriched node detail with materials, aims, prerequisites, cross-mappings sidebar, inline editor |
| 7 | `content-library/import/page.tsx` | **NEW** | JSON template upload page with instructions, file format spec, existing templates list |
| 8 | `components/json-template-uploader.tsx` | **NEW** | Client component: drag-and-drop upload, JSON validation, preview, import action |
| 9 | `curriculum/page.tsx` | **REPLACE** | Added Content Library banner link between instances and template fork section |

## File Placement

```
src/
├── app/(app)/(app)/pedagogy/
│   ├── curriculum/
│   │   └── page.tsx                          ← #9 REPLACE
│   └── content-library/
│       ├── layout.tsx                        ← #1 REPLACE
│       ├── page.tsx                          ← #2 REPLACE
│       ├── materials/
│       │   └── page.tsx                      ← #3 REPLACE
│       ├── compliance/
│       │   └── page.tsx                      ← #4 REPLACE
│       ├── cross-mappings/
│       │   └── page.tsx                      ← (unchanged)
│       ├── template/
│       │   └── [templateId]/
│       │       └── page.tsx                  ← #5 REPLACE
│       ├── node/
│       │   └── [nodeId]/
│       │       └── page.tsx                  ← #6 NEW
│       └── import/
│           └── page.tsx                      ← #7 NEW
└── components/domain/curriculum-content/
    └── json-template-uploader.tsx            ← #8 NEW
```

## Manual Steps Required

1. **Add "Content Library" to sidebar** — See SIDEBAR_UPDATE_INSTRUCTIONS.ts
2. **Add Module 14 permissions to constants** — See SIDEBAR_UPDATE_INSTRUCTIONS.ts
3. **Seed Module 14 permissions in database** — Run the SQL INSERT from SIDEBAR_UPDATE_INSTRUCTIONS.ts
4. **cross-mappings/page.tsx is UNCHANGED** — No action needed for this file
