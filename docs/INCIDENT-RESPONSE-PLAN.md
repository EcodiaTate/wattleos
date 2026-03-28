# WattleOS Incident Response Plan (IRP)

Version 1.0 | Last reviewed: 2026-03-28

This document defines WattleOS's response procedures for data breaches and security incidents, with particular focus on Notifiable Data Breaches (NDB) under the Australian Privacy Act 1988.

---

## 1. Definitions

### What constitutes a data breach

A **data breach** occurs when personal information held by WattleOS is:
- Accessed by an unauthorised person (e.g., cross-tenant data exposure)
- Disclosed to an unauthorised person (e.g., email sent to wrong recipient)
- Lost in circumstances where unauthorised access is likely (e.g., unencrypted backup lost)

### What constitutes a Notifiable Data Breach (NDB)

Under Part IIIC of the Privacy Act 1988, a breach is **notifiable** when:
1. There is unauthorised access to, or disclosure of, **personal information**
2. A reasonable person would conclude this is **likely to result in serious harm** to the affected individuals
3. The organisation has **not been able to prevent the likely risk of serious harm** through remedial action

### Serious harm factors (s 26WG)
- Nature and sensitivity of the information (medical records, custody data, child identifiers)
- Whether the information is protected by security measures (encryption, RLS)
- The persons who have obtained the information
- The nature of the harm that could result

### WattleOS-specific breach examples

| Scenario | Data at risk | Severity |
|----------|-------------|----------|
| Cross-tenant RLS bypass | Student records, medical conditions, custody restrictions from another school | CRITICAL |
| Medical record exposure | `medical_conditions` table — condition names, treatment plans, medication details | CRITICAL |
| Custody data breach | `custody_restrictions` — restricted persons, court order references | CRITICAL |
| Counsellor notes exposure | `counsellor_case_notes` — professional-privilege clinical assessments | CRITICAL |
| Guardian contact leak | Parent email, phone, address across tenants | HIGH |
| Staff credential compromise | WWCC numbers, qualifications, payroll data | HIGH |
| Invoice/billing leak | Fee amounts, payment methods, Centrelink CRN | HIGH |
| Observation data leak | Child observation notes, photos, developmental assessments | MEDIUM |
| Attendance data leak | Sign-in/out times, absence patterns | MEDIUM |

---

## 2. Detection Triggers

### Automated detection

| Trigger | Source | Response |
|---------|--------|----------|
| Unhandled exceptions spike | Sentry alerts (once integrated) | Investigate immediately for data exposure |
| Audit log anomalies | `audit_logs` table — bulk reads, unusual entity access patterns | Review within 1 hour |
| Failed login spikes | `auth_failed_logins` table — 10+ failures for one email in 15min | Auto-lockout + alert |
| Cross-tenant query attempts | RLS policy denials logged by Supabase | Review daily |
| Encryption failures | `[encryption] FATAL` errors in production logs | Immediate investigation |
| Unusual admin API usage | Supabase dashboard audit log — bulk exports, schema changes | Review within 4 hours |

### Manual detection

- Staff member reports suspicious activity (unusual data visible, unexpected emails)
- Parent reports receiving another family's information
- External security researcher reports a vulnerability
- Penetration test findings

### Reporting pathway

Any staff member who suspects a breach should:
1. Email **security@wattleos.au** immediately
2. Include: what they observed, when, which tenant/school, any screenshots
3. Do NOT attempt to reproduce or investigate further — containment team handles this

---

## 3. Containment Steps

### Immediate containment (within 1 hour of detection)

#### Step 1: Isolate affected tenant(s)

```sql
-- Disable the affected tenant to prevent further data access
UPDATE tenants SET is_active = false WHERE id = '<affected_tenant_id>';
```

This prevents all authenticated users of that tenant from accessing any data.

#### Step 2: Force-logout all sessions

- Via Supabase Dashboard: **Authentication > Users > select affected users > Revoke sessions**
- Or via Admin API:

```typescript
const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, { shouldSoftDelete: false });
// For mass logout: iterate affected tenant's users
```

#### Step 3: Rotate compromised credentials

| Credential | Location | Rotation method |
|-----------|----------|----------------|
| Supabase service_role key | Supabase Dashboard > Settings > API | Generate new key, update Vercel env vars, redeploy |
| FIELD_ENCRYPTION_KEY | Vercel env vars | Generate new key with `openssl rand -hex 32`, re-encrypt affected fields |
| JWT secret | Supabase Dashboard > Settings > API | Rotate (will invalidate all sessions) |
| Stripe API keys | Stripe Dashboard | Roll keys |
| CRON_SECRET | Vercel env vars | Generate new value |

#### Step 4: Preserve evidence

- Export Supabase query logs for the incident period
- Export `audit_logs` entries for affected tenants
- Screenshot any relevant Sentry error traces
- Do NOT delete or modify any log data

---

## 4. Scope Determination

Use the `audit_logs` table to determine the extent of the breach.

### Identify affected records

```sql
-- Find all access events for the affected entity type in the breach window
SELECT
  al.id,
  al.user_id,
  al.tenant_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.sensitivity,
  al.created_at,
  t.name as tenant_name,
  u.email as user_email
FROM audit_logs al
LEFT JOIN tenants t ON t.id = al.tenant_id
LEFT JOIN auth.users u ON u.id = al.user_id
WHERE al.created_at BETWEEN '<breach_start>' AND '<breach_end>'
  AND al.entity_type IN ('student', 'medical_condition', 'custody_restriction', 'counsellor_case_note')
ORDER BY al.created_at DESC;
```

### Identify affected schools

```sql
SELECT DISTINCT t.id, t.name, t.slug, COUNT(*) as affected_records
FROM audit_logs al
JOIN tenants t ON t.id = al.tenant_id
WHERE al.created_at BETWEEN '<breach_start>' AND '<breach_end>'
GROUP BY t.id, t.name, t.slug
ORDER BY affected_records DESC;
```

### Identify affected individuals

```sql
-- Students whose records were accessed
SELECT DISTINCT s.id, s.first_name, s.last_name, s.tenant_id, t.name as school_name
FROM audit_logs al
JOIN students s ON s.id = al.entity_id::uuid
JOIN tenants t ON t.id = s.tenant_id
WHERE al.entity_type IN ('student', 'medical_condition', 'custody_restriction')
  AND al.created_at BETWEEN '<breach_start>' AND '<breach_end>';
```

### Export for regulatory reporting

```sql
-- CSV export of all affected records for OAIC submission
COPY (
  SELECT al.*, t.name as tenant_name
  FROM audit_logs al
  JOIN tenants t ON t.id = al.tenant_id
  WHERE al.created_at BETWEEN '<breach_start>' AND '<breach_end>'
  ORDER BY al.created_at
) TO '/tmp/breach_audit_export.csv' WITH CSV HEADER;
```

---

## 5. Notification Timeline

### Regulatory notification — OAIC

| Milestone | Deadline | Action |
|-----------|----------|--------|
| Breach detected | Day 0 | Begin assessment |
| Assessment complete | Within 30 calendar days of awareness | Determine if breach is notifiable |
| OAIC notification | "As soon as practicable" after assessment | Submit NDB statement via [OAIC portal](https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach) |
| Individual notification | "As soon as practicable" after OAIC | Notify affected individuals |

### Internal escalation timeline

| Time | Action |
|------|--------|
| T+0 | Incident detected — Security Lead notified |
| T+15min | Containment actions initiated |
| T+1h | CTO briefed, initial scope assessment |
| T+4h | CEO briefed if breach is likely notifiable |
| T+24h | Legal counsel engaged if breach confirmed |
| T+48h | Draft OAIC statement prepared |
| T+72h | Draft individual notifications prepared |

---

## 6. Escalation Chain

### Roles and responsibilities

| Role | Person | Responsibility |
|------|--------|---------------|
| **Incident Commander** | Security Lead (or CTO if unavailable) | Coordinates response, makes containment decisions |
| **Technical Lead** | Senior Developer on-call | Executes containment, investigates root cause |
| **CTO** | Tom Grote | Approves remediation, briefs CEO |
| **CEO** | Kurt Jones | Approves external communications, engages legal |
| **Legal Counsel** | External (TBD) | Advises on NDB obligations, reviews OAIC statement |
| **Communications Lead** | CEO or delegate | Drafts and sends notifications to schools/parents |

### Escalation flow

```
Detection
  └→ Security Lead (immediate)
       └→ CTO (within 1 hour)
            └→ CEO (within 4 hours if likely notifiable)
                 └→ Legal Counsel (within 24 hours if breach confirmed)
                      └→ OAIC Notification (within 30 days)
```

---

## 7. Communication Templates

### 7a. Notification to affected schools

**Subject:** Important Security Notice — WattleOS Data Incident

> Dear [School Name] Administrator,
>
> We are writing to inform you of a data security incident that affected your WattleOS account.
>
> **What happened:** On [date], we identified [brief description of the incident — e.g., "a technical issue that temporarily allowed data from one school to be visible to users at another school"].
>
> **What information was involved:** [Specific data types — e.g., "Student names, class enrollment records, and attendance data for students at your school."]
>
> **What we have done:**
> - Contained the incident within [X hours] of detection
> - Identified and resolved the technical root cause
> - Confirmed the scope of affected records
> - Notified the Office of the Australian Information Commissioner (OAIC)
>
> **What you should do:**
> - Review any unusual activity in your school's audit log (Admin > Audit Log)
> - Notify affected families using the template below (or your own wording)
> - Contact us at security@wattleos.au with any questions
>
> **Contact:** For questions about this incident, please email security@wattleos.au or call [phone number].
>
> We sincerely apologise for this incident and are committed to protecting the privacy of your students and families.
>
> Regards,
> WattleOS Security Team

### 7b. Notification to affected parents/guardians

**Subject:** Notice About Your Child's Data at [School Name]

> Dear [Parent/Guardian Name],
>
> We are writing on behalf of [School Name] to inform you about a data incident involving [School Name]'s school management system, WattleOS.
>
> **What happened:** On [date], a technical issue resulted in [brief, plain-language description].
>
> **What information about your child was involved:** [Specific fields — e.g., "Your child's name, class enrollment, and attendance records." If medical data: "Your child's name and medical condition records."]
>
> **What has been done:**
> - The issue was identified and fixed on [date]
> - An independent review confirmed no ongoing risk
> - The Australian Information Commissioner has been notified
>
> **What you can do:**
> - If you notice any suspicious contact referencing your child's school information, please report it to [School Name] immediately
> - You can request a copy of all data held about your child by contacting [School Name]
>
> **Contact:** For questions, please contact [School Name] at [school email] or WattleOS at security@wattleos.au.
>
> We understand the sensitivity of your child's information and take this matter very seriously.
>
> Regards,
> [School Name] and WattleOS

### 7c. OAIC Notifiable Data Breach statement

Use the OAIC's [NDB Statement form](https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach) and include:

1. **Entity details:** Ecodia Pty Ltd (ABN: [TBD]), trading as WattleOS
2. **Description of the breach:** [Technical description — what happened, how, when]
3. **Kind of information involved:** Names, email addresses, [medical records if applicable], [custody information if applicable], student identifiers (CRN, USI, Medicare number if applicable)
4. **Number of individuals affected:** [Count from scope determination queries]
5. **Recommendations for individuals:** Monitor for suspicious contact, report any unusual activity
6. **Steps taken to contain:** [From Section 3 containment actions]
7. **Steps taken to prevent recurrence:** [From Section 8 remediation]

---

## 8. Post-Incident Review

### Root Cause Analysis template

Complete within 7 days of incident closure:

| Field | Detail |
|-------|--------|
| **Incident ID** | INC-YYYY-NNN |
| **Date detected** | |
| **Date contained** | |
| **Date resolved** | |
| **Root cause** | [Technical root cause — e.g., "Missing RLS policy on table X allowed cross-tenant SELECT"] |
| **Contributing factors** | [e.g., "No automated RLS coverage check in CI", "Table added in migration without security review"] |
| **Affected tenants** | [List] |
| **Affected individuals** | [Count] |
| **Data types exposed** | [List] |
| **Duration of exposure** | [From when the vulnerability was introduced to when it was contained] |
| **Detection method** | [How was it found?] |
| **OAIC notified** | Yes/No — date |

### Remediation tracking

| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| [e.g., Add RLS policy to table X] | | | |
| [e.g., Add CI check for RLS coverage] | | | |
| [e.g., Review all tables for similar pattern] | | | |
| [e.g., Update security audit checklist] | | | |

### Lessons learned

- What went well in the response?
- What could be improved?
- Were detection mechanisms adequate?
- Were containment procedures effective?
- Were communication templates sufficient?
- What process changes are needed?

---

## 9. Testing and Review Schedule

### Quarterly review
- Review this IRP document for accuracy
- Verify escalation contact details are current
- Confirm Supabase dashboard access for containment team
- Review audit log query templates against current schema

### Annual tabletop exercise
- Simulate a cross-tenant data exposure scenario
- Walk through all IRP steps with the response team
- Test communication templates with a mock school notification
- Time the response to identify bottlenecks
- Update IRP based on exercise findings

### After every schema change
- Verify new tables have RLS enabled
- Verify new tables have appropriate policies
- Verify new sensitive fields are included in encryption
- Update scope determination queries if new entity types are added

---

## Appendix A: Key Supabase tables for incident investigation

| Table | Contains | Sensitivity |
|-------|----------|-------------|
| `audit_logs` | All mutation and access events | Investigation primary source |
| `tenants` | School records, `is_active` flag for kill switch | Containment control |
| `tenant_users` | User-tenant memberships, roles | Scope determination |
| `students` | Student PII, identifiers | HIGH |
| `medical_conditions` | Encrypted medical data | CRITICAL |
| `custody_restrictions` | Encrypted custody/court data | CRITICAL |
| `counsellor_case_notes` | Professional privilege material | CRITICAL |
| `nccd_register_entries` | Encrypted disability data | CRITICAL |
| `individual_learning_plans` | Encrypted developmental data | HIGH |
| `emergency_contacts` | Encrypted contact details | HIGH |
| `fee_invoices` | Financial records | HIGH |

## Appendix B: Emergency contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Security Lead | TBD | security@wattleos.au | TBD |
| CTO | Tom Grote | TBD | TBD |
| CEO | Kurt Jones | TBD | TBD |
| Legal Counsel | TBD | TBD | TBD |
| OAIC | — | enquiries@oaic.gov.au | 1300 363 992 |
