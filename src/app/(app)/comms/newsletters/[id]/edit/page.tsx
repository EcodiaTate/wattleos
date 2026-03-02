// src/app/(app)/comms/newsletters/[id]/edit/page.tsx
//
// Newsletter editor page - edit title, body, audience,
// and send/schedule controls.

import { NewsletterEditorClient } from "@/components/domain/newsletter/newsletter-editor-client";
import { getNewsletter } from "@/lib/actions/comms/newsletter";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Newsletter - WattleOS" };

interface EditNewsletterPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNewsletterPage({
  params,
}: EditNewsletterPageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canSend = hasPermission(ctx, Permissions.SEND_NEWSLETTER);

  const result = await getNewsletter(id);

  if (result.error || !result.data) {
    notFound();
  }

  const nl = result.data;

  if (nl.status !== "draft" && nl.status !== "scheduled") {
    notFound();
  }

  // Load classes for audience targeting
  const supabase = await createSupabaseServerClient();
  const { data: classData } = await supabase
    .from("classes")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  const classes = (classData ?? []) as Array<{ id: string; name: string }>;

  return (
    <NewsletterEditorClient
      newsletter={nl}
      canSend={canSend}
      classes={classes}
    />
  );
}
