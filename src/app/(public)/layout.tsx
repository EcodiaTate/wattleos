import { EcodiaAttribution } from "@/components/ecodia-attribution";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="py-6 flex justify-center">
        <EcodiaAttribution />
      </footer>
    </div>
  );
}
