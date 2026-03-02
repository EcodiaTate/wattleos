// src/components/domain/volunteers/volunteer-card.tsx

import Link from "next/link";
import type { VolunteerWithWwccStatus } from "@/types/domain";
import { WwccStatusBadge } from "./wwcc-status-badge";
import { VolunteerStatusBadge } from "./volunteer-status-badge";

interface VolunteerCardProps {
  volunteer: VolunteerWithWwccStatus;
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  const initials =
    `${volunteer.first_name[0]}${volunteer.last_name[0]}`.toUpperCase();

  return (
    <Link
      href={`/admin/volunteers/${volunteer.id}`}
      className="card-interactive"
      style={{
        display: "block",
        padding: "1rem",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        textDecoration: "none",
        color: "var(--foreground)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.875rem",
            color: "var(--muted-foreground)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
              {volunteer.first_name} {volunteer.last_name}
            </span>
            <VolunteerStatusBadge status={volunteer.status} />
          </div>

          {(volunteer.email || volunteer.phone) && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--muted-foreground)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {volunteer.email ?? volunteer.phone}
            </p>
          )}

          <div style={{ marginTop: "0.5rem" }}>
            <WwccStatusBadge
              status={volunteer.wwcc_status}
              expiryDate={volunteer.wwcc_expiry_date}
              daysUntilExpiry={volunteer.days_until_expiry}
            />
            {volunteer.wwcc_state && (
              <span
                style={{
                  marginLeft: "0.375rem",
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                }}
              >
                {volunteer.wwcc_state}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
