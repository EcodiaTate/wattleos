// src/app/(app)/admin/volunteers/loading.tsx

export default function VolunteersLoading() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            className="animate-pulse"
            style={{
              height: 28,
              width: 140,
              borderRadius: "var(--radius)",
              backgroundColor: "var(--muted)",
            }}
          />
          <div
            className="animate-pulse"
            style={{
              height: 16,
              width: 240,
              borderRadius: "var(--radius)",
              backgroundColor: "var(--muted)",
              marginTop: 6,
            }}
          />
        </div>
        <div
          className="animate-pulse"
          style={{
            height: 36,
            width: 120,
            borderRadius: "var(--radius)",
            backgroundColor: "var(--muted)",
          }}
        />
      </div>

      {/* Stat cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 80,
              borderRadius: "var(--radius)",
              backgroundColor: "var(--muted)",
            }}
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1rem",
        }}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: 260,
              borderRadius: "var(--radius)",
              backgroundColor: "var(--muted)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
