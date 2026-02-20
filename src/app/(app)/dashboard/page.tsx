import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

// ============================================================
// Dashboard Page — Server Component
// ============================================================
// WHY server component: All data fetching happens on the server.
// No client interactivity needed — quick actions are plain <a> links.
// Permission checks run server-side via getTenantContext().
// ============================================================

export default async function DashboardPage() {
  const context = await getTenantContext();
  const greeting = getTimeGreeting();

  // Collect which quick actions this user can see
  const actions = buildQuickActions(context);

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* ── Welcome Header ── */}
      <div className="animate-fade-in-down">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}
          {context.user.first_name ? `, ${context.user.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.tenant.name} &middot; {context.role.name}
        </p>
      </div>

      {/* ── Quick Actions ── */}
      {actions.length > 0 && (
        <section aria-label="Quick actions">
          <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((action) => (
              <QuickActionCard key={action.href} {...action} />
            ))}
          </div>
        </section>
      )}

      {/* ── Today at a Glance ── */}
      <section aria-label="Today at a glance">
        <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Today at a Glance
            </h2>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: context.tenant.timezone ?? "Australia/Brisbane",
              }).format(new Date())}
            </p>
          </div>

          <div className="grid gap-[var(--density-md)] sm:grid-cols-2 lg:grid-cols-4">
            {hasPermission(context, Permissions.MANAGE_ATTENDANCE) && (
              <GlanceCard
                label="Attendance"
                href="/attendance"
                colorVar="--attendance-present"
                description="Mark today's roll"
              />
            )}

            {hasPermission(context, Permissions.CREATE_OBSERVATION) && (
              <GlanceCard
                label="Observations"
                href="/pedagogy/observations"
                colorVar="--curriculum-area"
                description="View recent observations"
              />
            )}

            {hasPermission(context, Permissions.VIEW_STUDENTS) && (
              <GlanceCard
                label="Students"
                href="/students"
                colorVar="--curriculum-outcome"
                description="Student directory"
              />
            )}

            {hasPermission(context, Permissions.MANAGE_MASTERY) && (
              <GlanceCard
                label="Mastery"
                href="/pedagogy/mastery"
                colorVar="--mastery-mastered"
                description="Track student progress"
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Recent Activity Placeholder ── */}
      {/* WHY placeholder: Once we wire up actual counts from server actions
          (observation count today, attendance %, students present), this
          section will show real-time stats. For now it provides navigation
          context so guides aren't staring at a blank screen. */}
      <section
        aria-label="Getting started"
        className="rounded-xl border border-dashed border-border bg-muted/30 p-[var(--density-card-padding)]"
      >
        <h2 className="text-sm font-semibold text-foreground">
          Your Montessori Toolkit
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-prose">
          WattleOS brings your observations, curriculum, mastery tracking, and
          student records together in one place. Use the quick actions above to
          jump into your daily workflow, or explore the sidebar to discover all
          available tools.
        </p>
      </section>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

/** Time-aware greeting based on server clock. */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Quick action configuration per permission. */
interface QuickAction {
  title: string;
  description: string;
  href: string;
  colorVar: string;
}

function buildQuickActions(context: Awaited<ReturnType<typeof getTenantContext>>): QuickAction[] {
  const actions: QuickAction[] = [];

  if (hasPermission(context, Permissions.CREATE_OBSERVATION)) {
    actions.push({
      title: "New Observation",
      description: "Capture a learning moment",
      href: "/pedagogy/observations/new",
      colorVar: "--curriculum-area",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_ATTENDANCE)) {
    actions.push({
      title: "Today's Roll",
      description: "Mark attendance for today",
      href: "/attendance",
      colorVar: "--attendance-present",
    });
  }

  if (hasPermission(context, Permissions.VIEW_STUDENTS)) {
    actions.push({
      title: "Students",
      description: "View and manage student profiles",
      href: "/students",
      colorVar: "--curriculum-outcome",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_CURRICULUM)) {
    actions.push({
      title: "Curriculum",
      description: "Browse learning outcomes",
      href: "/pedagogy/curriculum",
      colorVar: "--curriculum-activity",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_MASTERY)) {
    actions.push({
      title: "Mastery Tracking",
      description: "Update student progress",
      href: "/pedagogy/mastery",
      colorVar: "--mastery-mastered",
    });
  }

  if (hasPermission(context, Permissions.MANAGE_REPORTS)) {
    actions.push({
      title: "Reports",
      description: "Create and manage term reports",
      href: "/reports",
      colorVar: "--report-review",
    });
  }

  return actions;
}

// ============================================================
// Sub-components
// ============================================================

function QuickActionCard({
  title,
  description,
  href,
  colorVar,
}: QuickAction) {
  return (
    <a
      href={href}
      style={
        {
          "--card-accent": `var(${colorVar})`,
        } as React.CSSProperties
      }
      className="card-interactive group block rounded-xl border border-border bg-card p-[var(--density-card-padding)] transition-shadow hover:shadow-md"
    >
      <div
        className="mb-3 h-1.5 w-8 rounded-full transition-all group-hover:w-12"
        style={{ backgroundColor: "var(--card-accent)" }}
      />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </a>
  );
}

function GlanceCard({
  label,
  href,
  colorVar,
  description,
}: {
  label: string;
  href: string;
  colorVar: string;
  description: string;
}) {
  return (
    <a
      href={href}
      style={
        {
          "--glance-accent": `var(${colorVar})`,
        } as React.CSSProperties
      }
      className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
    >
      <div
        className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: "var(--glance-accent)" }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:underline">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}