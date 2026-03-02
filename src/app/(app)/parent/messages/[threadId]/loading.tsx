// src/app/(app)/parent/messages/[threadId]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function MessageThreadLoading() {
  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-48" />
      </div>
      {/* Messages */}
      <div className="flex-1 space-y-4 p-4 overflow-y-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
          >
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div
              className={`space-y-1 max-w-[60%] ${i % 2 === 0 ? "" : "items-end"}`}
            >
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}
