import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "WattleOS - Enter it once. Use it everywhere.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #FFFBF5 0%, #FEF3C7 50%, #FDE68A 100%)",
        fontFamily: "system-ui, sans-serif",
        padding: "60px",
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "96px",
          height: "96px",
          borderRadius: "24px",
          background: "#F59E0B",
          marginBottom: "32px",
          boxShadow: "0 8px 32px rgba(245, 158, 11, 0.3)",
        }}
      >
        <span style={{ fontSize: "48px", fontWeight: 800, color: "#FFFFFF" }}>
          W
        </span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "56px",
          fontWeight: 800,
          color: "#1C1917",
          lineHeight: 1.1,
          textAlign: "center",
          margin: "0 0 16px 0",
        }}
      >
        WattleOS
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: "28px",
          fontWeight: 500,
          color: "#78716C",
          textAlign: "center",
          margin: "0 0 12px 0",
        }}
      >
        Enter it once. Use it everywhere.
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "20px",
          fontWeight: 400,
          color: "#A8A29E",
          textAlign: "center",
          margin: 0,
        }}
      >
        Montessori-native school operating system
      </p>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "40px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          "Observations",
          "Curriculum",
          "Enrolment",
          "Attendance",
          "OSHC",
          "Communication",
        ].map((feature) => (
          <span
            key={feature}
            style={{
              padding: "8px 20px",
              borderRadius: "9999px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#92400E",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            {feature}
          </span>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
