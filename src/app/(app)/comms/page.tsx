// src/app/(app)/comms/page.tsx
//
// WHY redirect: Comms has three sub-sections. Announcements
// is the most-used surface so we default there.

import { redirect } from "next/navigation";

export const metadata = { title: "Communications - WattleOS" };

export default async function CommsPage() {
  redirect(`/comms/announcements`);
}
