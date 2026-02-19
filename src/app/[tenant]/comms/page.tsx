// src/app/[tenant]/comms/page.tsx
//
// WHY redirect: Comms has three sub-sections. Announcements
// is the most-used surface so we default there.

import { redirect } from "next/navigation";

interface CommsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function CommsPage({ params }: CommsPageProps) {
  const { tenant } = await params;
  redirect(`/${tenant}/comms/announcements`);
}
