"use client";

/**
 * Deterministic hash for a string, used to pick a consistent avatar color.
 * Simple djb2-style hash mapped to 0..7.
 */
function avatarColorIndex(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33) ^ id.charCodeAt(i);
  }
  return Math.abs(hash) % 8;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

interface PersonPhotoCardProps {
  id: string;
  name: string;
  subtitle: string | null;
  photoUrl: string | null;
  hasPhoto: boolean;
  onClick?: () => void;
}

export function PersonPhotoCard({
  id,
  name,
  subtitle,
  photoUrl,
  hasPhoto,
  onClick,
}: PersonPhotoCardProps) {
  const colorIdx = avatarColorIndex(id);
  const initials = getInitials(name);

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? {
        type: "button" as const,
        onClick,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`${
        onClick ? "card-interactive" : ""
      } flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)] text-left`}
      style={{ background: "var(--card)" }}
    >
      {/* Avatar */}
      <div
        className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          background: photoUrl
            ? undefined
            : `var(--avatar-${colorIdx})`,
          color: photoUrl ? undefined : "var(--avatar-fg)",
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold select-none">
            {initials}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {name}
        </p>
        {subtitle !== null && (
          <p
            className="truncate text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* No Photo badge */}
      {!hasPhoto && (
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: "var(--photo-no-photo-bg)",
            color: "var(--photo-no-photo)",
          }}
        >
          No Photo
        </span>
      )}
    </Wrapper>
  );
}
