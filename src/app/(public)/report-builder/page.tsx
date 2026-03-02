// src/app/(public)/report-builder/page.tsx
//
// ============================================================
// WattleOS Report Builder - Landing Page
// ============================================================
// The entry point for schools discovering the standalone
// Report Builder product. Not the main WattleOS marketing
// site - this is specific to the reports product.
//
// Target: Systems coordinator / Head of School
// Pain: Crystal Reports charges, Word doc workflows, weeks
//       of compiling and formatting term reports.
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "WattleOS Report Builder - Term reports without the pain",
  description:
    "Build report templates, let guides fill reports in-browser, review and export professional PDFs. Free to start.",
};

export default function ReportBuilderLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
              style={{ background: "var(--color-primary)" }}
            >
              W
            </div>
            <span className="font-semibold text-foreground">
              WattleOS Report Builder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/report-builder/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/report-builder/signup"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background:
              "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          Free for up to 40 students
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground">
          Term reports without
          <br />
          the pain
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Build a report template in 15 minutes. Guides fill reports in-browser
          with autosave. You review and export professional PDFs. No Word docs,
          no Crystal Reports bills, no chasing email attachments.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/report-builder/signup"
            className="rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl active:scale-95"
            style={{ background: "var(--color-primary)" }}
          >
            Start free - no credit card
          </Link>
          <p className="text-sm text-muted-foreground">
            One school can use it free, forever
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-foreground">
            From signup to first report in one afternoon
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Build your template",
                body: "Drag and drop sections - school philosophy, guide narratives, goals. Preview exactly what the report will look like. Done in 15 minutes.",
              },
              {
                step: "2",
                title: "Invite your guides",
                body: "Send an email invite. Guides click the link, create an account, and see only their assigned students. That's it.",
              },
              {
                step: "3",
                title: "Review and export",
                body: "Watch the dashboard fill up as guides submit. Review, approve, and export all reports as a ZIP of PDFs in two clicks.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-border bg-background p-6"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free tier callout */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Free tier, no strings
              </h2>
              <p className="mt-3 text-muted-foreground">
                WattleOS Report Builder is free for schools with up to 40
                students and 5 guides. That&apos;s one full Montessori class or
                two smaller ones. No credit card required, no trial period.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                When you&apos;re ready to connect attendance tracking, mastery
                summaries, or a parent portal - those are paid features. But the
                core workflow is free forever.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Template builder with unlimited sections",
                "Guide narratives with autosave",
                "Submit → review → approve workflow",
                "PDF export (individual + bulk)",
                "CSV student import",
                "Custom logo and branding on PDFs",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What it doesn't do */}
      <section className="border-t border-border bg-muted/20 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            WattleOS Report Builder is focused on one thing
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            It manages your term reports exceptionally well. It does not have a
            parent portal, billing, attendance tracking, or an SIS. Students are
            added manually or via CSV. When your school needs those things,
            connect the relevant modules - they fit together. But you don&apos;t
            need any of that to start using this today.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground">Ready to start?</h2>
        <p className="mt-4 text-muted-foreground">
          Sign up and have your first template ready before lunch.
        </p>
        <Link
          href="/report-builder/signup"
          className="mt-8 inline-flex rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          Create your free account
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>WattleOS Report Builder - part of the WattleOS school platform</p>
        <p className="mt-1">
          <Link
            href="/legal/privacy"
            className="hover:text-foreground underline"
          >
            Privacy
          </Link>
          {" · "}
          <Link href="/legal/terms" className="hover:text-foreground underline">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
