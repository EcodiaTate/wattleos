# WattleOS Deployment Checklist

**Status:** ✅ Code Ready for Production
**Build:** Passed (`tsc --noEmit` + `next build`)
**Last Audit:** 6 Mar 2026

---

## Pre-Deployment (Dev/DevOps)

- [ ] **Environment Setup**
  - [ ] Supabase production project created
  - [ ] PostgreSQL database migrations applied (`db:migrate`)
  - [ ] RLS policies active (verify `current_tenant_id()` function exists)
  - [ ] Auth provider configured (Magic Link, Apple Sign-In, Google)
  - [ ] JWT secrets generated and stored in `.env.local`

- [ ] **Third-Party Services**
  - [ ] Stripe Live account configured (not Test mode)
  - [ ] Stripe API keys in environment (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - [ ] Google Workspace API enabled (Drive, Gmail for Ask Wattle)
  - [ ] Google OAuth client created (school email domain)
  - [ ] Xero accounting integration API key set (if using billing sync)
  - [ ] Upstash Redis account provisioned (for rate limiting)
  - [ ] Resend email sending configured (or SendGrid alternative)

- [ ] **Compliance & Security**
  - [ ] SSL certificate installed (HTTPS required for Capacitor mobile)
  - [ ] CORS headers configured (for web + iOS/Android Capacitor)
  - [ ] DDoS/bot protection enabled (Cloudflare or similar)
  - [ ] Audit log storage verified (logAudit table has retention policy)
  - [ ] Backup schedule set (Supabase: daily snapshots, 30-day retention)
  - [ ] Privacy policy updated (data handling, third-party integrations)

- [ ] **Testing**
  - [ ] Full end-to-end test: Admission → Enrolment → Rostering → Incident
  - [ ] Mobile app tested on iOS and Android devices
  - [ ] Email notifications sent and received (Ask Wattle, incident alerts, parent reminders)
  - [ ] PDF export verified (QIP reports, incident forms)
  - [ ] Stripe test transaction → production refund flow
  - [ ] Emergency drill execution (Reg 97) end-to-end
  - [ ] Ratio monitoring real-time display (sign-in/out updates educator count)

---

## Day 1: School Pilot (Single Site)

- [ ] **Go-Live**
  - [ ] Production domain active and verified
  - [ ] Mobile app builds pushed to TestFlight (iOS) and Google Play (Android)
  - [ ] Staff accounts created in system
  - [ ] Initial children uploaded (CSV import in CCS module)
  - [ ] Rostering template imported (staff shifts)
  - [ ] Incident forms tested with supervisor approval

- [ ] **Monitoring**
  - [ ] Logs checked for errors: `curl https://api.wattleos.edu.au/api/logs/health-snapshot`
  - [ ] Database query performance baseline recorded
  - [ ] Staff feedback collected on UI/UX
  - [ ] Parent communication (welcome email, portal access) working

- [ ] **Compliance Verification**
  - [ ] Incident register accessible to director
  - [ ] Medication authorization alerts firing on schedule
  - [ ] Staff compliance dashboard shows WWCC/First Aid/Anaphylaxis status
  - [ ] Audit log recording all sensitive mutations (check dashboard)
  - [ ] Soft-delete working (archived records not deleted)

---

## Week 1–3: Pilot Refinement

- [ ] **User Training**
  - [ ] Directors trained on incident notification (24h SLA for serious)
  - [ ] Educators trained on medication admin (photo + notes required)
  - [ ] Office staff trained on admissions pipeline (stage transitions)
  - [ ] All staff tested on Emergency Drills (Reg 97 monthly execution)
  - [ ] Parents onboarded (portal access, Ask Wattle Q&A)

- [ ] **Data Quality**
  - [ ] Children data cleaned (birth dates, allergies, authorised persons)
  - [ ] Staff compliance records verified (WWCC dates, expiry alerts)
  - [ ] Educator ratios checked (system calculating correctly)
  - [ ] Excursion risk assessments reviewed and signed off

- [ ] **Issue Tracking**
  - [ ] Critical issues (crashes, permission errors) escalated to dev team
  - [ ] Feature requests captured (nice-to-have for Modules D, O, P)
  - [ ] Performance issues investigated (slow queries, mobile lag)

---

## Week 4: Full Production Rollout

- [ ] **Multi-School Deployment**
  - [ ] Supabase organizations configured (one tenant per school)
  - [ ] Billing activated (Stripe recurring subscriptions per school)
  - [ ] Staff accounts migrated from pilot
  - [ ] All schools have director-level admin access
  - [ ] Support contact and escalation path documented

- [ ] **Operational Readiness**
  - [ ] Daily audit log review process established
  - [ ] Incident notification response SLA (24h serious incidents to NQA)
  - [ ] Monthly emergency drill schedule set
  - [ ] Backup restoration tested (simulate Supabase restore from snapshot)
  - [ ] On-call support rotation for off-hours access

- [ ] **Regulatory Reporting**
  - [ ] NQA ITS export tested (Module C: Staff Compliance)
  - [ ] Geccko qualification tracking integrated (asthma/first aid/anaphylaxis)
  - [ ] Incident register ready for audit (all serious incidents flagged)
  - [ ] QIP assessment process verified (Module E: NQS alignment)

---

## Ongoing (Production)

- [ ] **Monthly**
  - [ ] Audit logs reviewed for anomalies (logAudit table)
  - [ ] Backup retention verified (30-day snapshot chain)
  - [ ] Performance metrics checked (query latency, error rate)
  - [ ] Emergency drill executed (Reg 97)
  - [ ] Staff compliance expiry alerts processed (WWCC, First Aid, Anaphylaxis)

- [ ] **Quarterly**
  - [ ] Security audit run (dependency scanning, vulnerability check)
  - [ ] Capacity planning review (database size, API rate limits)
  - [ ] RLS policy audit (ensure current_tenant_id() not bypassed)
  - [ ] NQA reporting prepared (incident register, serious incidents)

- [ ] **Annually**
  - [ ] Full system audit (code, database, third-party integrations)
  - [ ] Staff retraining on critical workflows (incidents, medications, drills)
  - [ ] Budget review (Supabase, Stripe, Google Workspace, Xero)
  - [ ] Disaster recovery test (failover, data restoration)

---

## Critical Hotlines (School Operations)

| Issue | Action | Escalation |
|-------|--------|-----------|
| Child injury → must notify parent in 24h | Create Incident (Module A), check "Serious" if hospital/missing | Director → NQA ITS within 24h |
| Medication due (e.g. asthma) | Check Medication alert → scan auth doc → record admin + photo | Nurse → Educator confirmation |
| Educator missing (ratio breach) | Toggle educator on-floor status in Ratio Monitor (Module D) | Director → Supervisor audit log |
| Staff WWCC expires tomorrow | System shows on Staff Compliance dashboard (Module C) | Director → Send Geccko training link |
| Excursion in 2 weeks | Create in Module H → upload risk assessment → parent consent | Supervisor → approves risk, collects consent |

---

## Known Limitations (Modules Not Yet Built)

| Module | ETA | Workaround |
|--------|-----|-----------|
| **Module D** (Ratio Monitoring) | Jun 2026 | Manual daily sign-in log; educator count tracked via rostering |
| **Module O** (Daily Care Log) | Jul 2026 | Paper forms or external system; import weekly |
| **Module P** (Conferences) | Aug 2026 | Google Calendar shared with parents; manual reminders |

---

## Success Metrics (4 Weeks Post-Launch)

- [ ] 95%+ uptime (target: < 1 hour unplanned downtime)
- [ ] < 100ms API response time (p95 latency)
- [ ] Zero compliance violations (audit log clean, no data breaches)
- [ ] 100% incident notification delivery (serious incidents → NQA within 24h)
- [ ] Staff adoption > 80% (daily active users across 3+ modules)
- [ ] Parent portal engagement > 60% (login weekly for school updates)

---

**Questions?** Contact dev team via Slack #wattleos-support
