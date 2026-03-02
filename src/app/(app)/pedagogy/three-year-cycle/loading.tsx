export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded-md" style={{ background: "var(--muted)" }} />
      <div className="h-4 w-80 rounded-md" style={{ background: "var(--muted)" }} />
      <div className="flex gap-2">
        <div className="h-9 w-36 rounded-md" style={{ background: "var(--muted)" }} />
        <div className="h-9 flex-1 rounded-md" style={{ background: "var(--muted)" }} />
      </div>
      <div className="h-64 rounded-lg border border-border" style={{ background: "var(--muted)" }} />
    </div>
  );
}
