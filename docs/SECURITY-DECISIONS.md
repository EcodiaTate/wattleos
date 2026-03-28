# Security Decisions

Documented rationale for security configuration choices in WattleOS.

---

## JWT Expiry: 30 Minutes

**Setting:** `jwt_expiry = 1800` in `supabase/config.toml`

**Default:** Supabase defaults to 3600 seconds (1 hour).

**Why 30 minutes:**

- WattleOS handles sensitive children's data including medical records, custody restrictions, and disability information. A shorter JWT window limits the blast radius of a stolen token.
- On shared classroom iPads, a 30-minute window means a forgotten session expires sooner if the `<SessionTimeout />` component is somehow bypassed.
- Combined with server-side session revocation (`signed_out_at` check in middleware), a stolen JWT is valid for at most 30 minutes even if the revocation check fails.
- Supabase automatically refreshes tokens using refresh tokens, so the shorter JWT window is invisible to users during active sessions. Only truly idle sessions (no browser tab open) will require re-authentication.

**Trade-off:** Slightly more frequent JWT refresh requests. Negligible performance impact since Supabase handles this client-side.

---

## MFA Enforcement

**Setting:** `require_mfa_for_roles` column on `tenants` table, defaults to `['Owner', 'Administrator']`.

**Why:**

- APP 11 (Australian Privacy Principles) requires reasonable security measures for personal information. MFA is a baseline expectation for admin accounts with access to all student and family data.
- Owner and Administrator roles have access to billing, medical records, custody data, and the ability to manage other users. A compromised admin account is the highest-impact breach scenario.
- Schools can extend MFA requirements to additional roles (Head of School, Lead Guide) via the admin settings UI.

---

## Session Revocation

**Mechanism:** `signed_out_at` column on `tenant_users`, checked in middleware against JWT `iat` claim.

**Why:**

- Supabase JWTs are stateless and valid until expiry. A stolen JWT remains usable even after the legitimate user signs out.
- By recording when a user signs out and checking the JWT's issued-at time against it, we can reject tokens that were issued before the logout event.
- The `forceLogoutUser()` action allows administrators to immediately revoke a compromised user's session without waiting for natural JWT expiry.
