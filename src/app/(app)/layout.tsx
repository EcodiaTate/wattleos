// src/app/(app)/layout.tsx
//
// ============================================================
// WattleOS V2 — App Layout (UPDATED: Display Settings + Comms + Timesheets)
// ============================================================
// CHANGES from previous version:
// • Calls getResolvedDisplayConfig() to sync the display cookie
//   on every authenticated page load. This ensures the root
//   layout always has current theme/density/brand data.
// • Replaced hardcoded bg-gray-50 and text classes with design
//   system tokens (bg-background, etc.)
// • All previous nav items preserved (comms, timesheets, parent)
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { Sidebar } from '@/components/domain/sidebar';
import { getUnreadAnnouncementCount } from '@/lib/actions/announcements';
import { getUnreadMessageCount } from '@/lib/actions/messaging';
import { getResolvedDisplayConfig } from '@/lib/actions/display-settings';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();

  // Sync the display cookie on every authenticated page load.
  // This is a lightweight read (one select) + cookie write.
  // Non-blocking: we don't need the result, just the side effect.
  getResolvedDisplayConfig().catch(() => {
    // Non-critical — layout will use whatever cookie already exists
  });

  // Fetch unread counts for badge display (runs server-side, no client overhead)
  let totalUnreadComms = 0;
  try {
    const [announcementResult, messageResult] = await Promise.all([
      getUnreadAnnouncementCount(),
      getUnreadMessageCount(),
    ]);
    totalUnreadComms =
      (announcementResult.data ?? 0) + (messageResult.data ?? 0);
  } catch {
    // Non-critical — badges just won't show
  }

  const navItems = buildNavItems(context.permissions, totalUnreadComms);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        tenantName={context.tenant.name}
        tenantLogo={context.tenant.logo_url}
        userName={
          [context.user.first_name, context.user.last_name]
            .filter(Boolean)
            .join(' ') || context.user.email
        }
        userEmail={context.user.email}
        userAvatar={context.user.avatar_url}
        roleName={context.role.name}
        navItems={navItems}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="content-grid py-[var(--density-page-padding)]">
          {children}
        </div>
      </main>
    </div>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

function buildNavItems(permissions: string[], unreadComms: number): NavItem[] {
  const items: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  ];

  // —— Pedagogy section ——————————————————————————
  if (
    permissions.includes(Permissions.CREATE_OBSERVATION) ||
    permissions.includes(Permissions.VIEW_ALL_OBSERVATIONS)
  ) {
    items.push({
      label: 'Observations',
      href: '/pedagogy/observations',
      icon: 'eye',
    });
  }

  if (permissions.includes(Permissions.MANAGE_CURRICULUM)) {
    items.push({
      label: 'Curriculum',
      href: '/pedagogy/curriculum',
      icon: 'book',
    });
  }

  if (permissions.includes(Permissions.MANAGE_MASTERY)) {
    items.push({
      label: 'Mastery',
      href: '/pedagogy/mastery',
      icon: 'chart',
    });
  }

  // —— SIS section ———————————————————————————————
  if (permissions.includes(Permissions.VIEW_STUDENTS)) {
    items.push({
      label: 'Students',
      href: '/students',
      icon: 'users',
    });
  }

  if (
    permissions.includes(Permissions.VIEW_STUDENTS) ||
    permissions.includes(Permissions.MANAGE_ENROLLMENT)
  ) {
    items.push({
      label: 'Classes',
      href: '/classes',
      icon: 'book',
    });
  }

  // —— Attendance —————————————————————————————————
  if (permissions.includes(Permissions.MANAGE_ATTENDANCE)) {
    items.push({
      label: 'Attendance',
      href: '/attendance',
      icon: 'clipboard',
    });
  }

  // —— Reports ————————————————————————————————————
  if (permissions.includes(Permissions.MANAGE_REPORTS)) {
    items.push({
      label: 'Reports',
      href: '/reports',
      icon: 'file',
    });
  }

  // —— Communications —————————————————————————————
  if (
    permissions.includes(Permissions.SEND_ANNOUNCEMENTS) ||
    permissions.includes(Permissions.SEND_CLASS_MESSAGES)
  ) {
    items.push({
      label: 'Communications',
      href: '/comms/announcements',
      icon: 'megaphone',
      badge: unreadComms > 0 ? unreadComms : undefined,
    });
  }

  // —— Timesheets (Phase 9b) ——————————————————————
  if (permissions.includes(Permissions.LOG_TIME)) {
    items.push({
      label: 'Timesheets',
      href: '/timesheets',
      icon: 'clock',
    });
  }

  // —— Parent Portal —————————————————————————————
  const isParent =
    !permissions.includes(Permissions.CREATE_OBSERVATION) &&
    !permissions.includes(Permissions.VIEW_ALL_OBSERVATIONS) &&
    !permissions.includes(Permissions.VIEW_STUDENTS) &&
    !permissions.includes(Permissions.MANAGE_ATTENDANCE);

  if (isParent) {
    items.push({
      label: 'My Children',
      href: '/parent',
      icon: 'heart',
    });
    items.push({
      label: 'Announcements',
      href: '/parent/announcements',
      icon: 'megaphone',
      badge: unreadComms > 0 ? unreadComms : undefined,
    });
    items.push({
      label: 'Messages',
      href: '/parent/messages',
      icon: 'chat',
    });
  }

  // —— Admin section ——————————————————————————————
  if (
    permissions.includes(Permissions.MANAGE_USERS) ||
    permissions.includes(Permissions.MANAGE_TENANT_SETTINGS)
  ) {
    items.push({
      label: 'Settings',
      href: '/admin',
      icon: 'settings',
    });
  }

  return items;
}