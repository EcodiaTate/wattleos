import type { IdCardTemplateConfig, IdCardPersonData } from "@/types/domain";

// ============================================================
// ID Card Preview (Module R)
// ============================================================
// Live HTML preview of an ID card (credit-card sized). Not a
// PDF - just a visual mockup that updates in real-time as
// config props change. Supports portrait and landscape layouts.
//
// Standard ID card size: 85.6mm x 54mm (ISO 7810 ID-1)
// We render at a fixed pixel scale for screen display.
// ============================================================

// Scale: 1mm = ~3.78px, but we use a convenient factor
// Card at roughly 1:1 mapping: 85.6mm -> 324px, 54mm -> 204px
const CARD_WIDTH_PX = 324;
const CARD_HEIGHT_PX = 204;

interface IdCardPreviewProps {
  config: IdCardTemplateConfig;
  person: IdCardPersonData;
  schoolName: string;
  schoolLogoUrl: string | null;
  year: string;
}

function PersonPhoto({
  photoUrl,
  displayName,
  size,
}: {
  photoUrl: string | null;
  displayName: string;
  size: number;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={displayName}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.5)",
        }}
      />
    );
  }

  // Placeholder with initials
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        border: "2px solid rgba(255,255,255,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "rgba(255,255,255,0.8)",
      }}
    >
      {initials}
    </div>
  );
}

function PortraitLayout({
  config,
  person,
  schoolName,
  schoolLogoUrl,
  year,
}: IdCardPreviewProps) {
  const displayName = person.preferred_name || person.first_name;
  const fullName = `${displayName} ${person.last_name}`;

  return (
    <div
      style={{
        width: CARD_WIDTH_PX,
        height: CARD_HEIGHT_PX,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        position: "relative",
      }}
    >
      {/* Left: photo section */}
      <div
        style={{
          width: "40%",
          background: config.primary_color,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
          gap: 6,
        }}
      >
        <PersonPhoto
          photoUrl={person.photo_url}
          displayName={fullName}
          size={80}
        />
        {config.show_qr_code && (
          <div
            style={{
              width: 36,
              height: 36,
              background: "white",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              color: "#333",
              marginTop: 4,
            }}
          >
            QR
          </div>
        )}
      </div>

      {/* Right: info section */}
      <div
        style={{
          width: "60%",
          background: config.secondary_color,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header with school name + logo */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {config.show_logo && schoolLogoUrl && (
              <img
                src={schoolLogoUrl}
                alt=""
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  objectFit: "contain",
                }}
              />
            )}
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.2,
              }}
            >
              {schoolName}
            </span>
          </div>

          {/* Name */}
          <p
            style={{
              fontSize: config.font_size_name,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {fullName}
          </p>

          {/* Class or position */}
          {config.show_class && (person.class_name || person.position) && (
            <p
              style={{
                fontSize: config.font_size_class,
                fontWeight: 500,
                color: "rgba(255,255,255,0.8)",
                marginTop: 4,
                margin: "4px 0 0",
              }}
            >
              {person.class_name || person.position}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {config.show_year && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {year}
            </span>
          )}
          {config.show_barcode && (
            <div
              style={{
                display: "flex",
                gap: 1,
                alignItems: "flex-end",
              }}
            >
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i % 3 === 0 ? 2 : 1,
                    height: 14 + (i % 5) * 2,
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: 0.5,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LandscapeLayout({
  config,
  person,
  schoolName,
  schoolLogoUrl,
  year,
}: IdCardPreviewProps) {
  const displayName = person.preferred_name || person.first_name;
  const fullName = `${displayName} ${person.last_name}`;

  return (
    <div
      style={{
        width: CARD_WIDTH_PX,
        height: CARD_HEIGHT_PX,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        position: "relative",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: config.primary_color,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {config.show_logo && schoolLogoUrl && (
            <img
              src={schoolLogoUrl}
              alt=""
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                objectFit: "contain",
              }}
            />
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
            }}
          >
            {schoolName}
          </span>
        </div>
        {config.show_year && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {year}
          </span>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          background: config.secondary_color,
          padding: 14,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Photo */}
        <PersonPhoto
          photoUrl={person.photo_url}
          displayName={fullName}
          size={90}
        />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: config.font_size_name,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {fullName}
          </p>
          {config.show_class && (person.class_name || person.position) && (
            <p
              style={{
                fontSize: config.font_size_class,
                fontWeight: 500,
                color: "rgba(255,255,255,0.8)",
                margin: "4px 0 0",
              }}
            >
              {person.class_name || person.position}
            </p>
          )}

          {/* QR + barcode row */}
          {(config.show_qr_code || config.show_barcode) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              {config.show_qr_code && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "white",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    color: "#333",
                  }}
                >
                  QR
                </div>
              )}
              {config.show_barcode && (
                <div
                  style={{
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-end",
                  }}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i % 3 === 0 ? 2 : 1,
                        height: 16 + (i % 5) * 2,
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: 0.5,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdCardPreview(props: IdCardPreviewProps) {
  if (props.config.card_orientation === "landscape") {
    return <LandscapeLayout {...props} />;
  }
  return <PortraitLayout {...props} />;
}
