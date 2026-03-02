"use client";

// src/components/domain/reports/GuidesClient.tsx
//
// ============================================================
// WattleOS Report Builder - Guides Client
// ============================================================
// Invite guides, view pending/accepted invitations,
// resend or revoke invites, list active guides.
// ============================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  inviteGuide,
  resendGuideInvite,
  revokeGuideInvite,
} from "@/lib/actions/reports/guide-invitations";
import type {
  GuideInvitation,
  ActiveGuide,
} from "@/lib/actions/reports/guide-invitations";

interface Props {
  initialInvitations: GuideInvitation[];
  initialActiveGuides: ActiveGuide[];
  guideCount: number;
  isFree: boolean;
  atLimit: boolean;
  freeLimit: number;
}

export function GuidesClient({
  initialInvitations,
  initialActiveGuides,
  guideCount: initialCount,
  isFree,
  atLimit: initialAtLimit,
  freeLimit,
}: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [activeGuides] = useState(initialActiveGuides);
  const [guideCount, setGuideCount] = useState(initialCount);
  const [atLimit, setAtLimit] = useState(initialAtLimit);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [classLabels, setClassLabels] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const labels = classLabels
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await inviteGuide({
        email: inviteEmail.trim().toLowerCase(),
        class_labels: labels,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data) {
        setInvitations((prev) => [result.data!, ...prev]);
        const newCount = guideCount + 1;
        setGuideCount(newCount);
        setAtLimit(isFree && newCount >= freeLimit);
      }
      setInviteEmail("");
      setClassLabels("");
      setShowInviteForm(false);
      setSuccess("Invitation sent.");
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  function handleResend(invitationId: string) {
    startTransition(async () => {
      const result = await resendGuideInvite(invitationId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data) {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitationId ? result.data! : inv)),
        );
      }
      setSuccess("Invitation resent. Link extended by 14 days.");
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  function handleRevoke(invitationId: string, email: string) {
    if (!confirm(`Revoke invitation for ${email}?`)) return;
    startTransition(async () => {
      const result = await revokeGuideInvite(invitationId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId
            ? { ...inv, status: "revoked" as const }
            : inv,
        ),
      );
      const newCount = Math.max(0, guideCount - 1);
      setGuideCount(newCount);
      setAtLimit(isFree && newCount >= freeLimit);
      setSuccess("Invitation revoked.");
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const otherInvites = invitations.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <span>/</span>
            <span className="text-foreground">Guides</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Guides</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {guideCount} guide{guideCount !== 1 ? "s" : ""}
            {isFree && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: atLimit
                    ? "color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent)"
                    : "var(--color-muted)",
                  color: atLimit
                    ? "var(--color-warning-fg, #92400e)"
                    : "var(--color-muted-foreground)",
                }}
              >
                {guideCount}/{freeLimit} free limit
              </span>
            )}
          </p>
        </div>
        {!atLimit && (
          <button
            type="button"
            onClick={() => {
              setShowInviteForm((v) => !v);
              setError(null);
            }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            Invite guide
          </button>
        )}
      </div>

      {/* Limit upsell */}
      {atLimit && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "var(--color-warning, #d97706)",
            background:
              "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-warning-fg)" }}
          >
            You&apos;ve reached the {freeLimit}-guide limit on the free plan
          </p>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--color-warning-fg)", opacity: 0.8 }}
          >
            Upgrade to Pro for unlimited guides.
          </p>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Guide%20Limit"
            className="mt-2 inline-flex items-center text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Ask about Pro →
          </a>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
            color: "var(--color-destructive)",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-success, #22c55e) 10%, transparent)",
            color: "var(--color-success-fg, #15803d)",
          }}
        >
          {success}
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Invite a guide
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Email address *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="guide@yourschool.edu.au"
                className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Class labels (optional)
              </label>
              <input
                type="text"
                value={classLabels}
                onChange={(e) => setClassLabels(e.target.value)}
                placeholder="Wattle Room 3–6, Banksia Room"
                className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated. Leave blank to give access to all students.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending || !inviteEmail}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-foreground, #fff)",
                }}
              >
                {isPending ? "Sending…" : "Send invite"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  setError(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active guides */}
      {activeGuides.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active guides
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {activeGuides.map((guide, i) => {
              const name =
                [guide.first_name, guide.last_name].filter(Boolean).join(" ") ||
                guide.email;
              return (
                <div
                  key={guide.user_id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {name}
                    </p>
                    {name !== guide.email && (
                      <p className="text-xs text-muted-foreground">
                        {guide.email}
                      </p>
                    )}
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background:
                        "color-mix(in srgb, var(--color-success, #22c55e) 15%, transparent)",
                      color: "var(--color-success-fg, #15803d)",
                    }}
                  >
                    Active
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pending invitations
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {pendingInvites.map((inv, i) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                isFirst={i === 0}
                isPending={isPending}
                onResend={() => handleResend(inv.id)}
                onRevoke={() => handleRevoke(inv.id, inv.email)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past invitations (revoked/expired/accepted) */}
      {otherInvites.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Past invitations
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {otherInvites.map((inv, i) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                isFirst={i === 0}
                isPending={isPending}
                onResend={
                  inv.status === "revoked" || inv.status === "expired"
                    ? () => handleResend(inv.id)
                    : undefined
                }
                onRevoke={undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {invitations.length === 0 && activeGuides.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No guides yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Invite a guide to start assigning reports.
          </p>
        </div>
      )}

      {/* Milestone expansion prompt 4 (from brief):
          "Your guides are spending 45 minutes writing each report manually.
           With WattleOS curriculum tracking, they'd spend 15." */}
      {activeGuides.length >= 3 && isFree && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "var(--color-border)",
            background:
              "color-mix(in srgb, var(--color-primary) 5%, var(--color-card))",
          }}
        >
          <p className="text-sm font-semibold text-foreground">
            Your guides are writing every report from scratch
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            With curriculum tracking connected, WattleOS pre-fills mastery
            summaries and pulls observation highlights automatically - guides
            spend less time on admin and more on what matters.
          </p>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Curriculum%20Tracking"
            className="mt-2 inline-flex items-center text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Ask about Pro →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Invitation row ────────────────────────────────────────────

const STATUS_STYLE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  pending: {
    bg: "color-mix(in srgb, var(--color-info, #3b82f6) 15%, transparent)",
    color: "var(--color-info-fg, #1d4ed8)",
    label: "Pending",
  },
  accepted: {
    bg: "color-mix(in srgb, var(--color-success, #22c55e) 15%, transparent)",
    color: "var(--color-success-fg, #15803d)",
    label: "Accepted",
  },
  expired: {
    bg: "color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent)",
    color: "var(--color-warning-fg, #92400e)",
    label: "Expired",
  },
  revoked: {
    bg: "var(--color-muted)",
    color: "var(--color-muted-foreground)",
    label: "Revoked",
  },
};

function InvitationRow({
  invitation,
  isFirst,
  isPending,
  onResend,
  onRevoke,
}: {
  invitation: GuideInvitation;
  isFirst: boolean;
  isPending: boolean;
  onResend?: () => void;
  onRevoke?: () => void;
}) {
  const style = STATUS_STYLE[invitation.status] ?? STATUS_STYLE.pending;
  const expiresDate = new Date(invitation.expires_at).toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "short",
    },
  );

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{ borderTop: !isFirst ? "1px solid var(--color-border)" : "none" }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {invitation.email}
        </p>
        {invitation.class_labels.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {invitation.class_labels.join(", ")}
          </p>
        )}
        {invitation.status === "pending" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Expires {expiresDate}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: style.bg, color: style.color }}
        >
          {style.label}
        </span>
        {onResend && (
          <button
            type="button"
            onClick={onResend}
            disabled={isPending}
            className="text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--color-primary)" }}
          >
            Resend
          </button>
        )}
        {onRevoke && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={isPending}
            className="text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--color-destructive)" }}
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
