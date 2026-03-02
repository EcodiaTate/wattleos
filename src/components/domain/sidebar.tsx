// src/components/domain/sidebar.tsx
//
// ============================================================
// WattleOS V2 - App Sidebar + Mobile Tab Bar
// ============================================================
// Handles ALL navigation chrome:
//
//   DESKTOP (lg+):
//     Left sidebar - collapsible to emoji-only mode.
//     Collapse state persists to localStorage.
//
//   MOBILE (<lg):
//     Bottom tab bar - 4 pinned tabs + "More" button.
//     "More" opens the full-screen sidebar drawer (same
//     sidebar panel, animated in from the left).
//     The hamburger button is gone - tab bar replaces it.
//
// THEMING: All colours use --sidebar-* CSS custom properties
// driven by data-sidebar-style="light|dark|brand" on <html>.
//
// HAPTICS: Tab taps fire Capacitor Haptics.impact(Light).
// Fails silently on web.
// ============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MobileTabItem, SidebarNavGroup } from "@/app/(app)/layout";
import {
  GlowTarget,
  useGlowTargetRef,
} from "@/components/domain/glow/glow-registry";
import { useHaptics } from "@/lib/hooks/use-haptics";

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = "wattleos-sidebar-collapsed";
const COLLAPSED_WIDTH = 64; // px - fits emoji + padding

// ============================================================
// Server Actions
// ============================================================

async function signOutAction() {
  const { redirect } = await import("next/navigation");
  redirect("/auth/logout");
}

async function switchTenantAction() {
  const { redirect } = await import("next/navigation");
  redirect("/auth/switch");
}

// ============================================================
// Props
// ============================================================

interface AppSidebarProps {
  tenantName: string;
  tenantLogo: string | null;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  roleName: string;
  navGroups: SidebarNavGroup[];
  mobileTabItems: MobileTabItem[];
  showTenantSwitcher?: boolean;
}

// ============================================================
// Tooltip - portal-based hover tooltip for collapsed icon mode
// ============================================================

function NavTooltip({
  label,
  children,
  show,
}: {
  label: string;
  children: React.ReactNode;
  show: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const updatePos = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  if (!show) return <>{children}</>;

  return (
    <div
      ref={wrapRef}
      className="group/tooltip relative"
      onMouseEnter={() => {
        updatePos();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        updatePos();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {mounted && open && pos
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[1000] -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg"
              style={{
                top: pos.top,
                left: pos.left,
                background: "var(--sidebar-foreground)",
                color: "var(--sidebar-background)",
              }}
            >
              {label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-sidebar-foreground" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ============================================================
// Icons
// ============================================================

const CollapseIcon = (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 19.5 8.25 12l7.5-7.5"
    />
  </svg>
);

const ExpandIcon = (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m8.25 4.5 7.5 7.5-7.5 7.5"
    />
  </svg>
);

// Grid icon for "More" tab
const MoreIcon = (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
    />
  </svg>
);

// ============================================================
// MobileTabBar - rendered fixed at the bottom on mobile
// ============================================================

function MobileTabBar({
  items,
  onMorePress,
}: {
  items: MobileTabItem[];
  onMorePress: () => void;
}) {
  const pathname = usePathname();
  const haptics = useHaptics();

  const handleTabPress = useCallback(
    (href: string, onClick?: () => void) => {
      haptics.impact("light");
      onClick?.();
    },
    [haptics],
  );

  const handleMorePress = useCallback(() => {
    haptics.impact("light");
    onMorePress();
  }, [haptics, onMorePress]);

  return (
    <nav className="mobile-tab-bar lg:hidden" aria-label="Main navigation">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const slug = item.href.replace(/^\//, "").replace(/\//g, "-");

        return (
          <MobileTabLink
            key={item.href}
            item={item}
            slug={slug}
            isActive={isActive}
            onPress={() => handleTabPress(item.href)}
          />
        );
      })}

      {/* More - always last, opens sidebar drawer */}
      <MobileMoreButton onPress={handleMorePress} />
    </nav>
  );
}

function MobileTabLink({
  item,
  slug,
  isActive,
  onPress,
}: {
  item: MobileTabItem;
  slug: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const glowRef = useGlowTargetRef(
    `nav-mobile-${slug}`,
    "nav-item",
    item.label,
  );

  return (
    <Link
      href={item.href}
      ref={glowRef as React.Ref<HTMLAnchorElement>}
      onClick={onPress}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 touch-target active:scale-[0.92]"
      style={{
        color: isActive
          ? "var(--sidebar-primary)"
          : "var(--sidebar-foreground)",
        opacity: isActive ? 1 : 0.55,
        transition:
          "opacity 200ms ease, transform 120ms ease, color 200ms ease",
      }}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Active indicator line - always present, opacity toggles */}
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full"
        style={{
          background: "var(--sidebar-primary)",
          width: isActive ? "28px" : "0px",
          opacity: isActive ? 1 : 0,
          transition:
            "width 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease",
        }}
      />

      {/* Emoji icon - slight scale on active */}
      <span
        className="leading-none"
        style={{
          fontSize: isActive ? "21px" : "20px",
          transition: "font-size 200ms ease",
        }}
      >
        {item.emoji}
      </span>

      {/* Label */}
      <span
        className="leading-none tracking-tight"
        style={{
          fontSize: "10px",
          fontWeight: isActive ? 700 : 600,
          transition: "font-weight 200ms ease",
        }}
      >
        {item.label}
      </span>

      {/* Unread badge */}
      {item.badge != null && item.badge > 0 && (
        <span
          className="absolute right-1/4 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold animate-scale-in"
          style={{
            background: "var(--sidebar-primary)",
            color: "var(--sidebar-primary-foreground)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

function MobileMoreButton({ onPress }: { onPress: () => void }) {
  const glowRef = useGlowTargetRef("nav-mobile-more", "button", "More");

  return (
    <button
      ref={glowRef as React.Ref<HTMLButtonElement>}
      onClick={onPress}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 touch-target active:scale-[0.92]"
      style={{
        color: "var(--sidebar-foreground)",
        opacity: 0.55,
        transition: "opacity 200ms ease, transform 120ms ease",
        background: "transparent",
        border: "none",
      }}
      aria-label="More navigation options"
    >
      {MoreIcon}
      <span className="text-[10px] font-semibold leading-none tracking-tight">
        More
      </span>
    </button>
  );
}

// ============================================================
// Sidebar Component
// ============================================================

export function AppSidebar({
  tenantName,
  tenantLogo,
  userName,
  userEmail: _userEmail,
  userAvatar,
  roleName,
  navGroups,
  mobileTabItems,
  showTenantSwitcher = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Collapsed state with localStorage persistence (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setIsCollapsed(true);
    } catch {
      // localStorage unavailable - use default
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const collapsed = isCollapsed && hydrated;

  const asideStyle: React.CSSProperties = collapsed
    ? { width: COLLAPSED_WIDTH }
    : {};

  return (
    <>
      {/* ── Mobile Bottom Tab Bar ──────────────────────────── */}
      <MobileTabBar
        items={mobileTabItems}
        onMorePress={() => setIsMobileOpen(true)}
      />

      {/* ── Mobile overlay (behind the drawer) ─────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 drawer-overlay lg:hidden"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={closeMobile}
        />
      )}

      {/* ── Sidebar panel ──────────────────────────────────── */}
      <aside
        style={{
          ...asideStyle,
          background: "var(--sidebar-background)",
          borderRight: "1px solid var(--sidebar-border)",
          boxShadow: isMobileOpen
            ? "8px 0 32px rgba(0,0,0,0.12), 1px 0 0 var(--sidebar-border)"
            : "4px 0 24px rgba(0,0,0,0.05), 1px 0 0 var(--sidebar-border)",
          transition:
            "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), width 200ms ease",
        }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col lg:static lg:translate-x-0 ${
          isMobileOpen
            ? "w-[var(--sidebar-width)] translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${!collapsed ? "lg:w-[var(--sidebar-width)]" : ""}`}
      >
        {/* ── Collapse toggle (desktop only) ─────────────── */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-[22px] z-[60] hidden h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-150 hover:scale-105 lg:flex"
          style={{
            background: "var(--sidebar-background)",
            color: "var(--sidebar-foreground)",
            border: "1.5px solid var(--sidebar-border)",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px var(--sidebar-border)",
          }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? ExpandIcon : CollapseIcon}
        </button>

        {/* ════════════════════════════════════════════════════
            TOP: School Logo + Name
            ════════════════════════════════════════════════════ */}
        <div
          className="relative flex items-center gap-3 px-3 pb-3 pt-4"
          style={{
            borderBottom: "1px solid var(--sidebar-border)",
            // Top safe area on iOS (status bar / dynamic island)
            paddingTop: "calc(1rem + var(--safe-top))",
          }}
        >
          {/* Top accent stripe */}
          <div
            className="absolute left-0 right-0 top-0 h-[3px]"
            style={{ background: "var(--sidebar-primary)", opacity: 0.85 }}
          />

          {/* Logo / Initial */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-base leading-none"
            style={{
              background: "var(--sidebar-item-active-bg)",
              color: "var(--sidebar-item-active-fg, var(--sidebar-primary))",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt={tenantName}
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              tenantName.charAt(0).toUpperCase()
            )}
          </div>

          {/* School name - hidden when collapsed */}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold leading-tight"
                style={{ color: "var(--sidebar-foreground)" }}
              >
                {tenantName}
              </p>
              <p
                className="mt-0.5 text-[11px] font-medium leading-none"
                style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}
              >
                WattleOS
              </p>
            </div>
          )}

          {/* Close button - mobile drawer only */}
          {!collapsed && (
            <button
              onClick={closeMobile}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg lg:hidden"
              style={{
                color: "var(--sidebar-foreground)",
                background: "var(--sidebar-accent)",
                opacity: 0.7,
              }}
              aria-label="Close navigation"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            MIDDLE: Grouped Navigation
            ════════════════════════════════════════════════════ */}
        <nav className="scroll-native flex-1 overflow-x-hidden px-2 py-3 [scrollbar-gutter:stable]">
          {navGroups.map((group, groupIdx) => (
            <div
              key={group.label}
              className={groupIdx > 0 ? "mb-3 mt-1" : "mb-3"}
            >
              {/* Section divider + label */}
              {!collapsed ? (
                <div className="mb-1 flex items-center gap-2 px-1">
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--sidebar-border)" }}
                  />
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}
                  >
                    {group.label}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--sidebar-border)" }}
                  />
                </div>
              ) : (
                groupIdx > 0 && (
                  <div
                    className="mx-auto mb-2 mt-1 h-px w-5"
                    style={{ background: "var(--sidebar-border)" }}
                  />
                )
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const navSlug = item.href
                    .replace(/^\//, "")
                    .replace(/\//g, "-");

                  return (
                    <GlowTarget
                      key={item.href}
                      id={`nav-item-${navSlug}`}
                      category="nav-item"
                      label={item.label}
                      context={{ route: item.href }}
                    >
                      <NavTooltip label={item.label} show={collapsed}>
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          data-active={isActive ? "true" : "false"}
                          className={`sidebar-nav-item relative flex items-center rounded-[var(--sidebar-item-radius)] text-sm font-medium touch-target ${
                            collapsed
                              ? "h-9 w-9 justify-center"
                              : "gap-2.5 px-2.5 py-1.5"
                          }`}
                        >
                          {/* Active indicator bar - animated on mount */}
                          {isActive && !collapsed && (
                            <span
                              className="sidebar-active-bar absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                              style={{ background: "var(--sidebar-primary)" }}
                            />
                          )}

                          {/* Emoji icon */}
                          <span className="shrink-0 text-center text-[15px] leading-none">
                            {item.emoji}
                          </span>

                          {/* Label + badge */}
                          {!collapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate">
                                {item.label}
                              </span>
                              {item.badge != null && item.badge > 0 && (
                                <span
                                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                                  style={{
                                    background: "var(--sidebar-primary)",
                                    color: "var(--sidebar-primary-foreground)",
                                  }}
                                >
                                  {item.badge > 99 ? "99+" : item.badge}
                                </span>
                              )}
                            </>
                          )}

                          {/* Badge dot - collapsed mode */}
                          {collapsed &&
                            item.badge != null &&
                            item.badge > 0 && (
                              <span
                                className="absolute right-1 top-1 h-2 w-2 rounded-full"
                                style={{ background: "var(--sidebar-primary)" }}
                              />
                            )}
                        </Link>
                      </NavTooltip>
                    </GlowTarget>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Settings link ── */}
          <div
            className="mt-auto pt-3"
            style={{ borderTop: "1px solid var(--sidebar-border)" }}
          >
            {(() => {
              const isActive =
                pathname === "/settings" || pathname.startsWith("/settings/");
              return (
                <GlowTarget
                  id="nav-item-settings"
                  category="nav-item"
                  label="Settings"
                  context={{ route: "/settings" }}
                >
                  <NavTooltip label="Settings" show={collapsed}>
                    <Link
                      href="/settings"
                      onClick={closeMobile}
                      data-active={isActive ? "true" : "false"}
                      className={`sidebar-nav-item relative flex items-center rounded-[var(--sidebar-item-radius)] text-sm font-medium touch-target ${
                        collapsed
                          ? "h-9 w-9 justify-center"
                          : "gap-2.5 px-2.5 py-1.5"
                      }`}
                    >
                      {isActive && !collapsed && (
                        <span
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                          style={{ background: "var(--sidebar-primary)" }}
                        />
                      )}
                      <span className="shrink-0 text-center text-[15px] leading-none">
                        ⚙️
                      </span>
                      {!collapsed && (
                        <span className="min-w-0 flex-1 truncate">
                          Settings
                        </span>
                      )}
                    </Link>
                  </NavTooltip>
                </GlowTarget>
              );
            })()}
          </div>
        </nav>

        {/* ════════════════════════════════════════════════════
            BOTTOM: User Profile + Actions
            ════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 p-2"
          style={{
            borderTop: "1px solid var(--sidebar-border)",
            // Bottom safe area inside the drawer on mobile
            paddingBottom: "calc(0.5rem + var(--safe-bottom))",
          }}
        >
          {collapsed ? (
            /* Collapsed: just the avatar */
            <NavTooltip label={userName} show>
              <div
                className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  background: "var(--sidebar-item-active-bg)",
                  color:
                    "var(--sidebar-item-active-fg, var(--sidebar-primary))",
                }}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
            </NavTooltip>
          ) : (
            /* Expanded: avatar + name + role + action buttons */
            <div
              className="rounded-xl p-2.5"
              style={{
                background: "var(--sidebar-item-hover-bg)",
                border: "1px solid var(--sidebar-border)",
              }}
            >
              {/* Avatar + identity */}
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: "var(--sidebar-item-active-bg)",
                    color:
                      "var(--sidebar-item-active-fg, var(--sidebar-primary))",
                    boxShadow:
                      "0 0 0 2px var(--sidebar-background), 0 0 0 3.5px var(--sidebar-primary)",
                  }}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-semibold leading-tight"
                    style={{ color: "var(--sidebar-foreground)" }}
                  >
                    {userName}
                  </p>
                  <p
                    className="truncate text-[11px] leading-tight"
                    style={{
                      color: "var(--sidebar-foreground)",
                      opacity: 0.65,
                    }}
                  >
                    {roleName}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-2.5 flex gap-1.5">
                {showTenantSwitcher && (
                  <form action={switchTenantAction} className="flex-1">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70 touch-target"
                      style={{
                        background: "var(--sidebar-background)",
                        color: "var(--sidebar-foreground)",
                        border: "1px solid var(--sidebar-border)",
                      }}
                    >
                      Switch School
                    </button>
                  </form>
                )}
                <form
                  action={signOutAction}
                  className={showTenantSwitcher ? "flex-1" : "w-full"}
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70 touch-target"
                    style={{
                      background: "var(--sidebar-background)",
                      color: "var(--sidebar-foreground)",
                      border: "1px solid var(--sidebar-border)",
                    }}
                  >
                    Sign Out
                  </button>
                </form>
              </div>

              {/* Ask Wattle shortcut */}
              <GlowTarget
                id="nav-btn-ask-wattle"
                category="button"
                label="Ask Wattle"
              >
                <button
                  className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-opacity hover:opacity-80 touch-target"
                  style={{
                    background: "var(--sidebar-item-active-bg)",
                    border: "1px solid var(--sidebar-border)",
                  }}
                  onClick={() => {
                    window.dispatchEvent(
                      new KeyboardEvent("keydown", {
                        key: "k",
                        ctrlKey: true,
                        bubbles: true,
                      }),
                    );
                  }}
                >
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color:
                        "var(--sidebar-item-active-fg, var(--sidebar-primary))",
                    }}
                  >
                    Ask Wattle
                  </span>
                  <kbd
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: "var(--sidebar-background)",
                      color:
                        "var(--sidebar-item-active-fg, var(--sidebar-primary))",
                      border: "1px solid var(--sidebar-border)",
                    }}
                  >
                    ⌘K
                  </kbd>
                </button>
              </GlowTarget>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
