"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, CheckCircle } from "lucide-react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { toggleHubBookmark } from "@/lib/actions/montessori-hub";
import { HUB_CATEGORY_CONFIG, HUB_AGE_BAND_CONFIG } from "@/lib/constants/montessori-hub";
import type { HubArticleSummary } from "@/types/domain";

interface HubArticleCardProps {
  article: HubArticleSummary;
}

export function HubArticleCard({ article }: HubArticleCardProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [bookmarked, setBookmarked] = useState(article.bookmarked);
  const catCfg = HUB_CATEGORY_CONFIG[article.category];

  function handleClick() {
    haptics.light();
    router.push(`/pedagogy/montessori-hub/${article.slug}`);
  }

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    haptics.medium();
    startTransition(async () => {
      const result = await toggleHubBookmark({
        article_id: article.id,
        bookmarked: next,
      });
      if (result.error) setBookmarked(!next);
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="card-interactive border border-border rounded-xl p-4 flex flex-col gap-3 cursor-pointer"
    >
      {/* Category tag + read indicator */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            color: catCfg.cssVar,
            backgroundColor: `color-mix(in srgb, ${catCfg.cssVar} 12%, transparent)`,
          }}
        >
          <span>{catCfg.emoji}</span>
          {catCfg.label}
        </span>
        <div className="flex items-center gap-2">
          {article.is_read && (
            <CheckCircle
              size={14}
              aria-label="Read"
              style={{ color: "var(--hub-status-published)" }}
            />
          )}
          <button
            onClick={handleBookmark}
            disabled={isPending}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            className="touch-target flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 active:scale-95"
            style={{ color: bookmarked ? "var(--hub-philosophy)" : "var(--muted-foreground)" }}
          >
            {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      {/* Title + summary */}
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{article.title}</h3>
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--muted-foreground)" }}>
          {article.summary}
        </p>
      </div>

      {/* Age bands */}
      {article.age_bands.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {article.age_bands.map((band) => (
            <span
              key={band}
              className="text-xs px-1.5 py-0.5 rounded border border-border"
              style={{ color: "var(--muted-foreground)" }}
            >
              {HUB_AGE_BAND_CONFIG[band].shortLabel}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
