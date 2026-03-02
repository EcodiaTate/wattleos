// src/app/(app)/parent/newsletters/page.tsx
//
// Parent newsletter feed - shows sent newsletters visible
// to the current parent based on their children's enrollments.

import { ParentNewsletterFeed } from "@/components/domain/newsletter/parent-newsletter-feed";
import { getNewslettersForParent } from "@/lib/actions/comms/newsletter";

export const metadata = { title: "Newsletters - WattleOS" };

export default async function ParentNewslettersPage() {
  const result = await getNewslettersForParent({ page: 1, per_page: 10 });

  return (
    <ParentNewsletterFeed
      initialNewsletters={result.data}
      initialTotal={result.pagination.total}
    />
  );
}
