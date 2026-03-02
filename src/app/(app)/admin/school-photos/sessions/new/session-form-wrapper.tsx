"use client";

// ============================================================
// WattleOS V2 - Session Form Wrapper (Client Component)
// ============================================================
// Wraps the SessionForm with navigation after successful creation.
// ============================================================

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SessionForm } from "@/components/domain/school-photos/session-form";
import { createPhotoSession } from "@/lib/actions/school-photos";
import type { CreateSessionInput } from "@/lib/validations/school-photos";

export function SessionFormWrapper() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateSessionInput) {
    setError(null);
    const result = await createPhotoSession(data);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data) {
      router.push(`/admin/school-photos/sessions/${result.data.id}`);
    }
  }

  return (
    <div className="max-w-xl">
      {error ? (
        <div
          className="mb-4 rounded-lg border border-border p-3 text-sm"
          style={{
            backgroundColor: "var(--photo-no-photo-bg)",
            color: "var(--photo-no-photo)",
          }}
        >
          {error}
        </div>
      ) : null}
      <SessionForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/school-photos")}
      />
    </div>
  );
}
