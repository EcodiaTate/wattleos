# WattleOS Data Retention Policy

**Version:** 1.0
**Effective date:** 2026-03-28
**Owner:** Ecodia Pty Ltd (on behalf of tenant schools)
**Regulatory basis:** Privacy Act 1988 (Cth), Australian Privacy Principles (APPs), ST4S Security Standard

---

## Overview

WattleOS stores personal information about children, families, and staff on behalf of schools that operate as "APP entities" under the Privacy Act 1988. This policy defines how long each category of data is retained, when it is archived, and when it is permanently deleted.

Schools are the data controllers; Ecodia Pty Ltd acts as a data processor. Schools must ensure that their own privacy notices are consistent with the retention periods below.

---

## Retention Schedule

### 1. Audit Logs

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | 0 – 2 years after `created_at` | Fully queryable in the WattleOS admin audit log viewer |
| **Archived** | After 2 years | Exported as JSON/CSV to cold storage (Supabase Storage, `audit-archive` bucket); marked `archived_at` in database |
| **Deleted** | After 7 years (`retain_until`) | Hard-deleted by the `audit-purge` cron job |

**Basis:** ST4S Security Standard minimum 7-year retention for audit trails. The Privacy Act requires records not be kept longer than necessary; 7 years satisfies both the school sector standard and the ATO/ASIC general record-keeping requirements applicable to service providers.

### 2. Student (Enrolment) Records

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | While enrolled | Fully accessible in WattleOS |
| **Archived** | After last date of attendance | Moved to read-only / soft-deleted state |
| **Deleted** | 7 years after last date of attendance, OR until the student turns 25 (whichever is later) | Personally identifiable fields purged on request or at expiry |

**Basis:** State/Territory education record-keeping requirements (generally 7 years post-attendance or age 25). Medical information may be subject to longer retention under state health legislation.

### 3. Staff Records

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | While employed | Fully accessible |
| **Archived** | After employment ends | Read-only |
| **Deleted** | 7 years after employment ends | Hard delete on request or at expiry |

**Basis:** Fair Work Act 2009 s.535 (employee records, 7 years); ATO PAYG withholding records (5 years); general Privacy Act obligations.

### 4. Visitor / Contractor Sign-in Records

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | Current record | Accessible in the visitors module |
| **Deleted** | 3 years after sign-in date | Hard delete |

**Basis:** Working with Children Check obligations and general safety record-keeping. Visitor records do not constitute "employee records" and 3 years is proportionate.

### 5. Financial / Billing Records

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | Current financial year | Fully accessible |
| **Archived** | After financial year end | Read-only in WattleOS; exportable for accounting |
| **Deleted** | 7 years after invoice date | Hard delete |

**Basis:** Corporations Act 2001 s.286 (financial records, 7 years); ATO tax record obligations.

### 6. Incident Reports

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | Until resolved + closed | Fully accessible |
| **Archived** | After closure | Read-only |
| **Deleted** | 7 years after incident date, or when student turns 25 (whichever is later) | Hard delete |

**Basis:** Education Services for Overseas Students (ESOS) Act and state-based child safety record-keeping obligations. Child-related incidents warrant the longer of the two periods.

---

## Technical Implementation

### Database columns on `audit_logs`

| Column | Type | Purpose |
|--------|------|---------|
| `retain_until` | `DATE` | Absolute deletion date, set to `created_at + 7 years` by default |
| `archived_at` | `TIMESTAMPTZ` | Populated when the row is exported to cold storage |

### Cron Jobs

| Route | Schedule | Action |
|-------|----------|--------|
| `POST /api/cron/audit-archive` | Daily at 02:00 AEST | Exports audit_logs older than 2 years (and not yet archived) to cold storage |
| `POST /api/cron/audit-purge` | Daily at 03:00 AEST | Hard-deletes archived audit_logs where `retain_until < now()` |

Both crons are authenticated via `CRON_SECRET` (Bearer token in Authorization header).

### Cold Storage

Archived audit logs are written to the Supabase Storage bucket `audit-archive` as line-delimited JSON:

```
audit-archive/{tenant_id}/{year}/{YYYY-MM-DD}.ndjson
```

These files are never automatically deleted by WattleOS. Bucket lifecycle rules (configured at the Supabase project level) should be set to retain files for the full 7-year window.

---

## Responsibilities

| Role | Responsibility |
|------|---------------|
| **School Owner / Principal** | Ensure parent/guardian privacy notices reflect these retention periods |
| **WattleOS Tenant Admin** | Trigger deletion requests for individuals who exercise their right to erasure |
| **Ecodia Pty Ltd** | Operate and maintain the cron jobs; provide deletion tooling on request |

---

## Right to Erasure

Where an individual exercises their right to erasure (Privacy Act s.13G / APP 11.2):
- WattleOS supports soft-delete (anonymisation) of student and staff records
- Audit log rows cannot be individually deleted within the retention window, as they form a tamper-evident chain required by ST4S
- After `retain_until` passes, rows are automatically purged

---

## Review Cycle

This policy is reviewed annually. The next review is due **2027-03-28**.

---

*Generated by WattleOS security remediation — Prompt 39.*
