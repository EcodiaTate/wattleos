"use client";

import { forkCurriculumTemplate } from "@/lib/actions/curriculum";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ForkTemplateButtonProps {
  templateId: string;
  templateName: string;
}

export function ForkTemplateButton({
  templateId,
  templateName,
}: ForkTemplateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFork() {
    setIsLoading(true);
    setError(null);

    const result = await forkCurriculumTemplate(templateId, templateName);

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    if (result.data) {
      router.push(`/pedagogy/curriculum/${result.data.id}`);
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handleFork}
        disabled={isLoading}
        className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Creating..." : "Use This Template"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
