"use client";

import { createBlankCurriculumInstance } from "@/lib/actions/curriculum";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateBlankButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await createBlankCurriculumInstance(name.trim());

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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Create Blank
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Curriculum name..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") setIsOpen(false);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={isLoading || !name.trim()}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create"}
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setName("");
          }}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
