"use client";

// src/components/domain/sms-gateway/opt-out-manager.tsx
// View and manage opt-out list.

import { useState, useTransition } from "react";
import { addOptOut, removeOptOut } from "@/lib/actions/sms-gateway";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  initialList: string[];
}

export function OptOutManager({ initialList }: Props) {
  const haptics = useHaptics();
  const [pending, startTransition] = useTransition();

  const [list,   setList]   = useState(initialList);
  const [phone,  setPhone]  = useState("");
  const [error,  setError]  = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const result = await addOptOut({ phone: phone.trim() });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        if (!list.includes(phone.trim())) {
          setList([...list, phone.trim()]);
        }
        setPhone("");
        haptics.success();
      }
    });
  }

  function handleRemove(p: string) {
    haptics.impact("light");
    startTransition(async () => {
      const result = await removeOptOut({ phone: p });
      if (result.error) {
        setError(result.error.message);
      } else {
        setList(list.filter((x) => x !== p));
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+61400000000"
          required
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <button
          type="submit"
          disabled={pending || !phone.trim()}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold active-push touch-target"
          style={{
            background:  "var(--primary)",
            color:       "var(--primary-foreground)",
            opacity:     pending || !phone.trim() ? 0.5 : 1,
          }}
        >
          Add
        </button>
      </form>

      {error && (
        <p className="text-sm" style={{ color: "var(--sms-failed-fg)" }}>{error}</p>
      )}

      {/* List */}
      {list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No numbers on the opt-out list.
        </p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {list.map((p, i) => (
            <div
              key={p}
              className="flex items-center justify-between border-t px-4 py-2.5 first:border-t-0"
              style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--card)" : "var(--background)" }}
            >
              <span className="font-mono text-sm" style={{ color: "var(--foreground)" }}>{p}</span>
              <button
                onClick={() => handleRemove(p)}
                disabled={pending}
                className="text-xs font-medium active-push touch-target"
                style={{ color: "var(--sms-failed-fg)" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Numbers on this list will not receive any SMS messages. This list is updated automatically when recipients reply STOP.
      </p>
    </div>
  );
}
