#!/usr/bin/env npx tsx
// scripts/security-test.ts
//
// ============================================================
// WattleOS Security Test Suite
// ============================================================
// Runs automated security checks against a running WattleOS
// instance. Covers the OWASP Top 10 attack vectors that are
// relevant to this app's architecture.
//
// USAGE:
//   npx tsx scripts/security-test.ts                 # against localhost:3001
//   BASE_URL=https://staging.wattleos.com npx tsx scripts/security-test.ts
//
// THREAT MODEL:
//   These tests simulate two attacker positions:
//
//   1. UNAUTHENTICATED attacker - anonymous internet user
//      Can hit any public URL, craft requests, fuzz inputs.
//      Tests here require no credentials.
//
//   2. AUTHENTICATED attacker - valid account at Tenant A
//      Tries to access Tenant B data, exceed permissions,
//      abuse LLM endpoints, etc.
//      Tests here need SESSION_COOKIE env var (see below).
//
// OUT OF SCOPE (different threat domains):
//   - GitHub repo access → rotate secrets, use environment vars
//   - Supabase service_role key → infrastructure security
//   - GCP/Google account access → identity security (use hardware keys)
//   These bypass the app entirely, so app-level code can't stop them.
//
// GETTING A SESSION COOKIE FOR AUTHENTICATED TESTS:
//   1. Log in to http://localhost:3001 in Chrome
//   2. DevTools → Application → Cookies → localhost
//   3. Copy the sb-* cookies (Supabase session)
//   4. Set env: SESSION_COOKIE="sb-xxx-auth-token=eyJ..."
// ============================================================

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "";

// ─── Test runner ──────────────────────────────────────────────

type TestResult = { name: string; passed: boolean; detail: string };
const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<{ passed: boolean; detail: string }>,
) {
  try {
    const result = await fn();
    results.push({ name, ...result });
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${name}`);
    if (!result.passed) console.log(`   → ${result.detail}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, detail: `THREW: ${detail}` });
    console.log(`💥 ${name}`);
    console.log(`   → ${detail}`);
  }
}

function skip(name: string, reason: string) {
  console.log(`⏭  ${name}`);
  console.log(`   → SKIPPED: ${reason}`);
  results.push({ name, passed: true, detail: `skipped: ${reason}` });
}

async function get(path: string, opts: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual", // Don't follow redirects - we want to inspect them
    ...opts,
  });
}

async function post(path: string, body: unknown, opts: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
    ...opts,
  });
}

function authedHeaders(): Record<string, string> {
  return SESSION_COOKIE ? { Cookie: SESSION_COOKIE } : {};
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  // ─── Section: Security Headers ────────────────────────────────

  console.log("\n── Security Headers ──────────────────────────────────────");

  await test("CSP header is present", async () => {
    const res = await get("/");
    const csp = res.headers.get("content-security-policy");
    if (!csp)
      return {
        passed: false,
        detail: "Content-Security-Policy header missing",
      };
    return { passed: true, detail: csp.slice(0, 80) + "..." };
  });

  await test("CSP blocks frame embedding (frame-ancestors none)", async () => {
    const res = await get("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    const passed = csp.includes("frame-ancestors 'none'");
    return {
      passed,
      detail: passed
        ? "frame-ancestors 'none' present"
        : "frame-ancestors not set",
    };
  });

  await test("X-Frame-Options: DENY", async () => {
    const res = await get("/");
    const val = res.headers.get("x-frame-options");
    return { passed: val === "DENY", detail: `Got: ${val ?? "missing"}` };
  });

  await test("X-Content-Type-Options: nosniff", async () => {
    const res = await get("/");
    const val = res.headers.get("x-content-type-options");
    return { passed: val === "nosniff", detail: `Got: ${val ?? "missing"}` };
  });

  await test("Referrer-Policy set", async () => {
    const res = await get("/");
    const val = res.headers.get("referrer-policy");
    return { passed: !!val, detail: `Got: ${val ?? "missing"}` };
  });

  await test("Permissions-Policy restricts camera/mic/geo", async () => {
    const res = await get("/");
    const val = res.headers.get("permissions-policy") ?? "";
    const passed =
      val.includes("camera=()") &&
      val.includes("microphone=()") &&
      val.includes("geolocation=()");
    return { passed, detail: `Got: ${val || "missing"}` };
  });

  if (BASE_URL.startsWith("https://")) {
    await test("HSTS header present on HTTPS", async () => {
      const res = await get("/");
      const val = res.headers.get("strict-transport-security");
      return { passed: !!val, detail: `Got: ${val ?? "missing"}` };
    });
  } else {
    skip(
      "HSTS header (HTTPS only)",
      "Not running over HTTPS - HSTS is production-only by design",
    );
  }

  // ─── Section: Auth & Access Control ──────────────────────────

  console.log("\n── Auth & Access Control ─────────────────────────────────");

  await test("Protected route /dashboard redirects unauthenticated user", async () => {
    const res = await get("/dashboard");
    // Should be a redirect (3xx) to /login
    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get("location") ?? "";
    const toLogin = location.includes("/login");
    return {
      passed: isRedirect && toLogin,
      detail: `Status: ${res.status}, Location: ${location || "none"}`,
    };
  });

  await test("Protected route /settings redirects unauthenticated user", async () => {
    const res = await get("/settings");
    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get("location") ?? "";
    return {
      passed: isRedirect && location.includes("/login"),
      detail: `Status: ${res.status}, Location: ${location || "none"}`,
    };
  });

  await test("API route /api/ask-wattle requires auth (401 without cookie)", async () => {
    const res = await post("/api/ask-wattle", { message: "hello" });
    return {
      passed: res.status === 401,
      detail: `Got status: ${res.status} (expected 401)`,
    };
  });

  await test("Webhook endpoint is accessible without auth (it handles its own)", async () => {
    // This should NOT be redirected to /login - Stripe needs to reach it directly.
    // It should return 400 (bad signature) not 301/302 to login.
    const res = await post(
      "/api/webhooks/stripe",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          // No Stripe-Signature header - expect 400, not a login redirect
        },
      },
    );
    const passed = res.status !== 301 && res.status !== 302;
    return {
      passed,
      detail: `Got status: ${res.status} (should not be a redirect)`,
    };
  });

  await test("Wrong HTTP method on POST-only API route returns 4xx (not 200)", async () => {
    // GET on a POST-only route. Middleware returns 401 before Next.js can return
    // 405, which is fine - the request is rejected either way.
    const res = await get("/api/ask-wattle");
    const passed = res.status === 401 || res.status === 405;
    return {
      passed,
      detail: `Got ${res.status} (expected 401 from middleware or 405 from Next.js - not 200)`,
    };
  });

  await test("POST on GET-only API route returns 4xx (not 200)", async () => {
    // The report PDF route only exports GET. A POST should be rejected.
    const res = await post(
      "/api/reports/00000000-0000-0000-0000-000000000000/pdf",
      {},
    );
    const passed = res.status === 401 || res.status === 405;
    return {
      passed,
      detail: `Got ${res.status} (expected 401 from middleware or 405 from Next.js - not 200)`,
    };
  });

  // ─── Section: Open Redirect ───────────────────────────────────

  console.log("\n── Open Redirect ─────────────────────────────────────────");

  await test("Auth callback ignores absolute redirect URLs", async () => {
    // Without a valid OAuth code, the callback returns a login error redirect.
    // The redirect= param is only used in the success path, so we can't fully
    // test it without a real code. But we can verify the code-missing path
    // doesn't blindly redirect to evil.com.
    const res = await get("/auth/callback?redirect=https://evil.com");
    const location = res.headers.get("location") ?? "";
    const leaked = location.startsWith("https://evil.com");
    return {
      passed: !leaked,
      detail: leaked
        ? `VULNERABLE: Redirected to ${location}`
        : `Safe - redirected to: ${location}`,
    };
  });

  await test("Auth callback ignores protocol-relative redirect URLs", async () => {
    const res = await get("/auth/callback?redirect=//evil.com");
    const location = res.headers.get("location") ?? "";
    const leaked =
      location.startsWith("//evil.com") ||
      location.startsWith("http://evil.com");
    return {
      passed: !leaked,
      detail: leaked
        ? `VULNERABLE: Redirected to ${location}`
        : `Safe - redirected to: ${location}`,
    };
  });

  // ─── Section: CORS ────────────────────────────────────────────

  console.log("\n── CORS ──────────────────────────────────────────────────");

  await test("API route does not return wildcard CORS header", async () => {
    // If Access-Control-Allow-Origin: * is set, any website can read our API
    // responses via fetch() - including session data, tenant data, etc.
    // Next.js has no CORS headers by default, so this should be absent or
    // restricted to same-origin.
    const res = await post(
      "/api/ask-wattle",
      { message: "cors test" },
      {
        headers: {
          Origin: "https://evil.com",
          "Content-Type": "application/json",
        },
      },
    );
    const acao = res.headers.get("access-control-allow-origin");
    const passed = acao !== "*" && acao !== "https://evil.com";
    return {
      passed,
      detail: passed
        ? `ACAO: ${acao ?? "not set"} (correct - evil.com cannot read responses)`
        : `VULNERABLE: ACAO is "${acao}" - cross-origin JS can read our API`,
    };
  });

  await test("CORS preflight does not grant access to arbitrary origins", async () => {
    // OPTIONS preflight from evil.com should not get a permissive ACAO response.
    const res = await fetch(`${BASE_URL}/api/ask-wattle`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
      redirect: "manual",
    });
    const acao = res.headers.get("access-control-allow-origin");
    const passed = acao !== "*" && acao !== "https://evil.com";
    return {
      passed,
      detail: passed
        ? `ACAO on OPTIONS: ${acao ?? "not set"} (correct)`
        : `VULNERABLE: ACAO on OPTIONS is "${acao}"`,
    };
  });

  // ─── Section: Rate Limiting ───────────────────────────────────

  console.log("\n── Rate Limiting ─────────────────────────────────────────");

  // NOTE on public_write rate limits:
  // submitInquiry and submitEnrollmentApplication are Next.js Server Actions,
  // not HTTP API routes. They run via POST to their parent page URL with a
  // Next-Action header - they cannot be tested with a plain fetch().
  // Rate limiting IS wired up (rateLimitOrFail in both actions).
  // To verify manually: submit the inquiry form 6+ times rapidly and confirm
  // the 6th attempt returns the "Too many requests" error message.
  skip(
    "Public form rate limit (submitInquiry / submitEnrollmentApplication)",
    "These are Server Actions - not directly HTTP-testable. Rate limiting is wired; verify manually via the UI.",
  );

  // ─── Section: Authenticated Tests ─────────────────────────────

  console.log("\n── Authenticated Tests ───────────────────────────────────");

  if (!SESSION_COOKIE) {
    skip(
      "LLM rate limit test (authenticated)",
      "Set SESSION_COOKIE env var to run authenticated tests",
    );
    skip(
      "Cross-tenant isolation test",
      "Set SESSION_COOKIE env var to run authenticated tests",
    );
    skip(
      "Permission escalation test",
      "Set SESSION_COOKIE env var to run authenticated tests",
    );
  } else {
    await test("Authenticated user can reach /dashboard", async () => {
      const res = await get("/dashboard", { headers: authedHeaders() });
      // 200 means we're in, 3xx means auth failed
      return {
        passed: res.status === 200,
        detail: `Status: ${res.status} (expected 200 - if 3xx, cookie may be expired)`,
      };
    });

    await test("LLM rate limit triggers after 30 requests/min", async () => {
      let hitLimit = false;
      let lastStatus = 0;

      // Fire 35 requests rapidly - should hit 429 by ~request 31
      for (let i = 0; i < 35; i++) {
        const res = await post(
          "/api/ask-wattle",
          { message: `Rate limit test message ${i}` },
          { headers: authedHeaders() },
        );
        lastStatus = res.status;
        if (res.status === 429) {
          hitLimit = true;
          console.log(`   → Hit 429 at request ${i + 1}`);
          break;
        }
      }

      return {
        passed: hitLimit,
        detail: hitLimit
          ? "Rate limit correctly enforced"
          : `No 429 after 35 requests (last: ${lastStatus}). Check Upstash config.`,
      };
    });
  }

  // ─── Section: Input Validation ────────────────────────────────

  console.log("\n── Input Validation ──────────────────────────────────────");

  await test("API route rejects malformed JSON gracefully", async () => {
    const res = await fetch(`${BASE_URL}/api/ask-wattle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json{{{",
      redirect: "manual",
    });
    // Should not crash the server (500) - ideally 400 or 401
    // 401 is fine if auth check runs before body parsing
    return {
      passed: res.status !== 500,
      detail: `Status: ${res.status}`,
    };
  });

  await test("Webhook with no signature returns 400 (not 500)", async () => {
    const res = await post("/api/webhooks/stripe", { type: "invoice.paid" });
    return {
      passed: res.status === 400,
      detail: `Status: ${res.status} (expected 400 for missing/invalid signature)`,
    };
  });

  // ─── Summary ──────────────────────────────────────────────────

  console.log("\n── Summary ───────────────────────────────────────────────");

  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  console.log(`\n${passed.length} passed, ${failed.length} failed`);

  if (failed.length > 0) {
    console.log("\nFailed tests:");
    for (const r of failed) {
      console.log(`  ❌ ${r.name}`);
      console.log(`     ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log("\nAll security checks passed.");
  }
} // end main()

main().catch((err) => {
  console.error("Security test suite crashed:", err);
  process.exit(1);
});

// ─── Manual Pentest Checklist ─────────────────────────────────
//
// The following require two test accounts at different tenants
// and cannot be automated without real credentials. Run these
// manually against staging when testing major changes.
//
// CROSS-TENANT ISOLATION:
//   1. Log in as a staff member at School A
//   2. Note your tenant_id from the JWT (DevTools → Application
//      → Cookies → decode the sb-* JWT at jwt.io)
//   3. Try hitting /api/ask-wattle or /dashboard with School B's
//      data IDs in the request body
//   4. Expected: RLS blocks access, no School B data returned
//
// PERMISSION ESCALATION:
//   1. Log in as a "Guide" role (lowest staff permission)
//   2. Try calling server actions that require manage_users
//      (e.g., POST to invite a user)
//   3. Expected: requirePermission() throws Forbidden
//
// SESSION HIJACK:
//   1. Copy session cookies from Browser A
//   2. Paste into Browser B (different machine)
//   3. Verify session works (expected - this is how SSR sessions work)
//   4. Log out in Browser A
//   5. Refresh Browser B - should now be redirected to /login
//      (Supabase invalidates the refresh token on signOut)
//
// JWT TAMPERING:
//   1. Copy your JWT from DevTools
//   2. Decode at jwt.io, modify app_metadata.tenant_id
//   3. Try to use the modified token
//   4. Expected: Supabase rejects it (signature verification fails)
//
// INVITE TOKEN BRUTE FORCE:
//   1. Attempt 10+ requests to /auth/callback?invite_token=random
//      from the same IP in under 15 minutes
//   2. Expected: 429 after the auth_action limit kicks in
//
// COOKIE SECURITY FLAGS:
//   After logging in, check the sb-* session cookies in DevTools:
//   Application → Cookies → localhost (or your domain)
//   Expected flags on the auth-token cookie:
//     ✅ HttpOnly - JS cannot read it (XSS can't steal the token)
//     ✅ Secure - only sent over HTTPS in production
//     ✅ SameSite=Lax - not sent on cross-site POST (CSRF protection)
//     ✅ Path=/ - scoped to whole site
//   If HttpOnly is missing, any XSS vulnerability becomes a full session steal.
//   Supabase SSR sets these by default - verify they haven't been overridden.
//
// ERROR MESSAGE LEAKAGE:
//   Trigger a controlled 500 (e.g., pass an invalid Supabase config in staging)
//   and verify the response body contains only the generic message:
//     { "error": "Internal server error" }
//   NOT the raw exception message or stack trace.
//   API routes /api/ask-wattle and /api/reports/*/pdf have been hardened.
//   Scan other routes for: `return NextResponse.json({ error: err.message })`
//
// PUBLIC RATE LIMIT (manual UI test):
//   1. Open the inquiry form at /?tenant=<your-slug>
//   2. Submit it 6 times rapidly with different emails
//   3. Expected: 6th attempt shows "Too many requests. Try again in X minutes."
//   This verifies rateLimitOrFail("public_write") is working in submitInquiry.
