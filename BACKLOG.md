# WattleOS Backlog

`- [x]` = shipped · `- [ ]` = not started · `- [-]` = in progress
Priority: 🔴 P1 critical/compliance · 🟡 P2 core · 🟢 P3 enhancement

## When starting a section add a hyphen in the brackets. When finished building your section add an x in the brackset and move it to the top of the list.

---

## Student Information

- [x] 🟡 NCCD disability register — category, funding level, adjustment type, evidence linkage
- [x] 🟡 CALD background fields — country of birth, home language, interpreter required flag
- [x] 🟢 Previous school records — prior school name, dates, transfer document upload
- [x] 🟡 Media consent surfacing — yes/no flag visible at point of use in observations, photos, comms

---

## Attendance & Safety

- [x] 🔴 Late arrival / early departure kiosk — school-day sign-in/out, timestamp, reason code, parent signature
- [x] 🔴 Unexplained absence follow-up — auto SMS/call trigger when absence unexcused by configurable cutoff time
- [x] 🟡 Chronic absence monitoring — flag students below threshold (e.g. <85%), trend chart, referral prompt
- [x] 🟢 ACARA attendance reporting — ACARA-format attendance export
- [x] 🟡 End-of-day pickup / bus confirmation — per-student confirmation: collected by authorised person or boarded correct bus
- [x] 🟡 Visitor sign-in log — name, purpose, who visiting, time in/out, ID sighted flag
- [x] 🟡 Contractor sign-in log — licence/insurance number, work location, induction confirmed

---

## Communications

- [x] 🟢 Newsletter module — rich-text templates, scheduled send, read-receipt tracking (distinct from announcements)
- [x] 🔴 SMS gateway — MessageMedia / Burst SMS integration for announcements, absence alerts, emergency comms
- [x] 🟡 Parent-teacher interview scheduling — staff slot setup, parent self-booking, reminders, outcome notes
- [x] 🟡 Push notification dispatch — notification centre UI, per-topic opt-in, delivery receipts (token storage exists; dispatch layer missing)
- [x] 🟢 Fee notice comms — billing-triggered comms type on invoice generated / overdue

---

## Finance & Billing

- [x] 🔴 Fee schedule setup — fee types, amounts, GST, sibling discounts, effective dates
- [x] 🔴 Tuition billing — term/weekly invoices from fee schedule, distinct from OSHC billing
- [x] 🔴 Direct debit / recurring billing — Stripe BECS, CCS gap fee auto-collect, failed payment retry
- [x] 🟡 Debt management — overdue dashboard, payment plans, reminder sequences, write-off workflow
- [x] 🟢 Grant tracking — grant name, amount, period, acquittal date, milestones, expenditures, documents

---

## HR & Staff

- [x] 🟡 Food safety certificate tracking — add to staff compliance module with expiry alerts
- [x] 🟡 Mandatory reporting training records — distinct cert type in staff compliance (Child Protection)
- [x] 🟢 KeyPay / Employment Hero integration — timesheet export as alternative to Xero

---

## Reporting & Compliance

- [x] 🟢 NAPLAN coordination — cohort list, test window, opt-out records, results storage (admin only, not delivery)
- [x] 🟢 ACARA reporting fields — SES, ATSI, LBOTE, disability flag in student export

---

## Wellbeing & Pastoral Care

- [x] 🟡 Student wellbeing flags — configurable concern categories, date, staff notes
- [x] 🟡 Referral tracking — internal/external referrals (speech, OT, psych), status, follow-up dates
- [x] 🔴 Counsellor case notes — restricted access (counsellor + principal only), role-gated, not in standard profile
- [x] 🟡 Wellbeing check-ins — structured periodic check-in form, trend view per student
- [x] 🟡 Pastoral care records — general pastoral log, concern notes, parent contacts (separate from comms)

---

## Health Records

- [x] 🟡 Sick bay visits log — presenting complaint, action taken, parent contacted, departure time

---

## Events & Excursions

- [x] 🟡 Volunteer coordination — WWCC verification before rostering, role assignments, confirmation emails
- [x] 🟢 Transport booking notes — bus company, vehicle, driver contact, pickup/drop-off times per excursion
- [x] 🟡 Event RSVPs — parent attending/not attending on event invites, headcount summary for staff

---

## Canteen (light)

- [ ] 🟢 Menu visibility — read-only current canteen menu display in parent portal
- [ ] 🟢 QuickCliq / Flexischools integration — deep-link or API for pre-orders placed via Wattle
- [ ] 🟢 Canteen account balance — read-only balance pulled from QuickCliq/Flexischools API

---

## Montessori-Specific

- [x] 🔴 Three-period lesson stage tracking — per child/concept: Introduction → Association → Recall, with progression gating
- [-] 🔴 Sensitive period flags — active sensitive periods per child (language, order, movement, small objects, music, social) with linked material suggestions
- [x] 🟡 Normalization indicators — concentration span, work cycle engagement depth, self-direction patterns; tracked over time
- [x] 🟡 Material / shelf inventory — physical materials per environment, condition, location, date introduced to each child
- [x] 🟡 Prepared environment planner — shelf layout planning, material rotation schedule, seasonal/thematic changes
- [x] 🟡 Three-year cycle progress view — longitudinal progress reports spanning the full 3-year age band (not per-term)
- [x] 🟡 Work cycle integrity tracking — log interruptions to the 3-hour work cycle, frequency trends, flagging patterns
- [x] 🟡 AMI / AMS / MSAA accreditation checklist — Montessori-body accreditation self-assessment, distinct from QIP/MQ:AP
- [x] 🟢 Cosmic education unit planning — great lessons, cultural studies, integrated project planning for 6–12 programmes
- [x] 🟢 Parent Montessori literacy hub — in-app guides explaining Montessori concepts, linked contextually from observations and portfolios

---

## AI Enhancements

- [ ] 🟡 Observation auto-tagging — AI-suggested EYLF/NQF + Montessori area tags on save, presented as confirmable chips (not auto-applied)
