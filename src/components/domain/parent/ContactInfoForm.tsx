// src/components/domain/parent/ContactInfoForm.tsx
//
// ============================================================
// WattleOS V2 - Contact Info Form (Client Component)
// ============================================================
// Phone number self-service. Parents can update their contact
// number without admin intervention. Shows inline edit pattern.
// ============================================================

"use client";

import { updateContactInfo } from "@/lib/actions/parent";
import { useState, useTransition } from "react";

interface ContactInfoFormProps {
  guardianId: string;
  initialPhone: string | null;
}

export function ContactInfoForm({
  guardianId,
  initialPhone,
}: ContactInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [savedPhone, setSavedPhone] = useState(initialPhone ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateContactInfo({
        guardianId,
        phone: phone.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        setSavedPhone(phone.trim());
        setIsEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  function handleCancel() {
    setPhone(savedPhone);
    setIsEditing(false);
    setError(null);
  }

  if (!isEditing) {
    return (
      <div className="mt-2 flex items-center gap-3">
        <div className="text-sm text-gray-700">
          {savedPhone ? (
            <span>📞 {savedPhone}</span>
          ) : (
            <span className="italic text-gray-400">No phone number set</span>
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          Edit
        </button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., 0412 345 678"
          autoFocus
          className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
