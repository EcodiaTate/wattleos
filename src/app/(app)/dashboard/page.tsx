import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export default async function DashboardPage() {
  const context = await getTenantContext();

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back
          {context.user.first_name ? `, ${context.user.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.tenant.name} &middot; {context.role.name}
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
        {hasPermission(context, Permissions.CREATE_OBSERVATION) && (
          <QuickActionCard
            title="New Observation"
            description="Capture a learning moment"
            href="/pedagogy/observations/new"
            icon="eye"
            color="amber"
          />
        )}

        {hasPermission(context, Permissions.MANAGE_ATTENDANCE) && (
          <QuickActionCard
            title="Today's Attendance"
            description="Mark the daily roll"
            href="/attendance"
            icon="clipboard"
            color="green"
          />
        )}

        {hasPermission(context, Permissions.VIEW_STUDENTS) && (
          <QuickActionCard
            title="Student Profiles"
            description="View and manage students"
            href="/students"
            icon="users"
            color="blue"
          />
        )}

        {hasPermission(context, Permissions.MANAGE_CURRICULUM) && (
          <QuickActionCard
            title="Curriculum"
            description="Manage learning outcomes"
            href="/pedagogy/curriculum"
            icon="book"
            color="purple"
          />
        )}

        {hasPermission(context, Permissions.MANAGE_MASTERY) && (
          <QuickActionCard
            title="Mastery Tracking"
            description="Update student progress"
            href="/pedagogy/mastery"
            icon="chart"
            color="teal"
          />
        )}

        {hasPermission(context, Permissions.MANAGE_REPORTS) && (
          <QuickActionCard
            title="Reports"
            description="Create term reports"
            href="/reports"
            icon="file"
            color="orange"
          />
        )}
      </div>

      {/* Module status - shows what's been built */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <h2 className="text-lg font-semibold text-foreground">System Status</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          WattleOS V2 build progress
        </p>
        <div className="mt-4 space-y-3">
          <ModuleStatus
            name="Core Platform & Identity"
            status="active"
            module={1}
          />
          <ModuleStatus name="Curriculum Engine" status="pending" module={2} />
          <ModuleStatus name="Observation Engine" status="pending" module={3} />
          <ModuleStatus
            name="Mastery & Portfolios"
            status="pending"
            module={4}
          />
          <ModuleStatus
            name="Student Information System"
            status="pending"
            module={5}
          />
          <ModuleStatus
            name="Attendance & Safety"
            status="pending"
            module={6}
          />
          <ModuleStatus
            name="Reporting & Communications"
            status="pending"
            module={7}
          />
          <ModuleStatus name="Integration Pipes" status="pending" module={8} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components (co-located, Server Components)
// ============================================================

const COLOR_MAP: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

function QuickActionCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className={`block rounded-lg border p-[var(--density-card-padding)] transition-shadow hover:shadow-md ${COLOR_MAP[color] ?? COLOR_MAP.amber}`}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs opacity-75">{description}</p>
    </a>
  );
}

function ModuleStatus({
  name,
  status,
  module,
}: {
  name: string;
  status: "active" | "pending" | "complete";
  module: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          status === "active"
            ? "bg-amber-100 text-amber-700"
            : status === "complete"
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {module}
      </div>
      <span
        className={`text-sm ${
          status === "active"
            ? "font-medium text-foreground"
            : status === "complete"
              ? "text-green-700"
              : "text-muted-foreground"
        }`}
      >
        {name}
      </span>
      {status === "active" && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          In Progress
        </span>
      )}
      {status === "complete" && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Complete
        </span>
      )}
    </div>
  );
}
