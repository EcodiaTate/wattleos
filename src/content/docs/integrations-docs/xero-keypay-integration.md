# Xero and KeyPay Payroll Integration

WattleOS supports connecting to Xero and KeyPay as external payroll providers. These integrations push approved timesheet data out of WattleOS into your payroll system, which then handles the compliance-critical calculations - tax, superannuation, award rates, penalty rates, and leave entitlements. WattleOS is the source of truth for "what happened" (who worked, when, what type of hours); Xero or KeyPay is the source of truth for "what it costs."

## Current Status

The credential configuration, employee mapping, and timesheet approval workflow are fully built and operational. The actual API calls to push timesheet data to Xero and KeyPay are planned for a future release. In the current version, approved timesheets are marked as "synced" for workflow completeness, and the approved hour totals (regular, overtime, leave breakdowns) are accurate and ready for manual entry into your payroll system.

## Choosing a Provider

Navigate to **Admin → Settings → Payroll** and select your payroll provider from the dropdown: None (manual export), Xero, or KeyPay. Selecting a provider configures the system for that provider's integration flow. Only one provider can be active at a time.

Xero is a widely used cloud accounting platform that includes payroll functionality. KeyPay is an Australian-focused payroll platform designed specifically for Australian employment law, including Modern Awards, superannuation, and Single Touch Payroll reporting. Choose the one your school already uses for payroll.

## Setting Up Xero

Navigate to **Admin → Integrations** and expand the Xero card. Three credentials are required: a Client ID and Client Secret from your Xero app (created in the Xero Developer Portal), and your Xero Tenant ID (your organisation's identifier, found in your Xero connected apps settings).

## Setting Up KeyPay

Navigate to **Admin → Integrations** and expand the KeyPay card. Two credentials are required: an API Key (generated in your KeyPay account under API settings) and your Business ID (your KeyPay organisation identifier).

## Employee Mapping

Before timesheets can be synced, each WattleOS staff member must be mapped to their corresponding employee record in the payroll system. Navigate to **Admin → Settings → Payroll → Employee Mapping** to manage these connections. For each staff member, enter their external employee ID (the Xero Employee ID or KeyPay Employee ID) and optionally their external name for verification. See the Employee Mapping and Payroll Sync documentation for full details.

## The Sync Flow

When automatic sync is available, the flow will work as follows. A staff member logs their hours in WattleOS and submits their timesheet. An approver reviews and approves the timesheet. The approved timesheet is synced to the payroll provider - WattleOS sends the employee's external ID, the pay period dates, and the hour breakdowns (regular, overtime, and leave hours). The payroll system records the hours and applies the appropriate award rates, tax, and superannuation calculations. WattleOS marks the timesheet as synced and stores the external reference ID. The administrator marks the pay period as processed.

## Why WattleOS Does Not Calculate Pay

This is a deliberate architectural decision. Australian employment law requires compliance with Modern Awards, the Fair Work Act, superannuation guarantee legislation, and Single Touch Payroll reporting. Getting these calculations wrong has legal consequences including penalties from the Fair Work Ombudsman and the ATO. Xero and KeyPay are purpose-built for these calculations, maintain up-to-date award interpretation databases, and carry professional indemnity for their compliance calculations. WattleOS adds value by capturing accurate time data and automating the approval workflow - it does not add value by attempting to replicate payroll compliance logic.

## Permissions

Configuring Xero or KeyPay credentials requires the **MANAGE_INTEGRATIONS** permission. Selecting the payroll provider in settings requires the same permission. Employee mapping management requires MANAGE_INTEGRATIONS. The timesheet approval workflow that precedes sync requires **APPROVE_TIMESHEETS**.
