"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Bookmark, Search, ChevronRight } from "lucide-react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { HubArticleCard } from "./hub-article-card";
import {
  HUB_CATEGORY_CONFIG,
  HUB_CATEGORY_DISPLAY_ORDER,
} from "@/lib/constants/montessori-hub";
import type { HubDashboardData, HubArticleCategory } from "@/types/domain";

interface HubDashboardClientProps {
  data: HubDashboardData;
  canManage: boolean;
}

export function HubDashboardClient({ data, canManage }: HubDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [activeCategory, setActiveCategory] = useState<HubArticleCategory | "all" | "bookmarks">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Build category order from data (only show categories that have articles)
  const availableCategories = HUB_CATEGORY_DISPLAY_ORDER.filter((cat) =>
    data.by_category.some((bc) => bc.category === cat && bc.count > 0)
  );

  const categoryMap = new Map(
    data.by_category.map((bc) => [bc.category, bc])
  );

  // Articles to show in main grid
  let displayArticles = (() => {
    if (activeCategory === "bookmarks") return data.bookmarks;
    if (activeCategory === "all") return data.by_category.flatMap((bc) => bc.articles);
    return categoryMap.get(activeCategory)?.articles ?? [];
  })();

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayArticles = displayArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }

  // Progress stats
  const readPercent =
    data.total_articles > 0
      ? Math.round((data.articles_read_by_user / data.total_articles) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Montessori Hub</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Guides to help you understand and extend the Montessori approach
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              haptics.light();
              router.push("/pedagogy/montessori-hub/new");
            }}
            className="touch-target active-push flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border border-border"
          >
            + New Article
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<BookOpen size={16} />}
          label="Articles"
          value={data.total_articles}
          cssVar="var(--hub-language)"
        />
        <StatCard
          icon={<span className="text-sm">✓</span>}
          label="Read"
          value={`${readPercent}%`}
          cssVar="var(--hub-status-published)"
        />
        <StatCard
          icon={<Bookmark size={16} />}
          label="Saved"
          value={data.bookmarked_by_user}
          cssVar="var(--hub-philosophy)"
        />
      </div>

      {/* Progress bar */}
      {data.total_articles > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>Your progress</span>
            <span>{data.articles_read_by_user} / {data.total_articles} articles read</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${readPercent}%`,
                backgroundColor: "var(--hub-status-published)",
              }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          type="search"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "var(--hub-language)" } as React.CSSProperties}
        />
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto scroll-native pb-1 -mx-1 px-1">
        <CategoryTab
          label="All"
          active={activeCategory === "all"}
          onClick={() => {
            haptics.light();
            setActiveCategory("all");
          }}
        />
        {data.bookmarks.length > 0 && (
          <CategoryTab
            label="Saved"
            emoji="🔖"
            active={activeCategory === "bookmarks"}
            onClick={() => {
              haptics.light();
              setActiveCategory("bookmarks");
            }}
          />
        )}
        {availableCategories.map((cat) => {
          const cfg = HUB_CATEGORY_CONFIG[cat];
          const bc = categoryMap.get(cat);
          return (
            <CategoryTab
              key={cat}
              label={cfg.label.split(" ")[0]}
              emoji={cfg.emoji}
              count={bc?.count}
              active={activeCategory === cat}
              cssVar={cfg.cssVar}
              onClick={() => {
                haptics.light();
                setActiveCategory(cat);
              }}
            />
          );
        })}
      </div>

      {/* Article grid */}
      {displayArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <BookOpen size={40} style={{ color: "var(--empty-state-icon)" }} />
          <p className="text-sm font-medium">
            {searchQuery ? "No articles match your search" : "No articles yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {searchQuery ? "Try a different search term" : "Articles will appear here when published"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayArticles.map((article) => (
            <HubArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Recently added section (only on "all" view without search) */}
      {activeCategory === "all" && !searchQuery && data.recent.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recently Added</h2>
            <button
              onClick={() => {
                haptics.light();
                router.push("/pedagogy/montessori-hub/all");
              }}
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scroll-native pb-2">
            {data.recent.slice(0, 4).map((article) => (
              <div key={article.id} className="flex-shrink-0 w-64">
                <HubArticleCard article={article} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  cssVar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  cssVar: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl border border-border">
      <div className="flex items-center gap-1.5" style={{ color: cssVar }}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold" style={{ color: cssVar }}>
        {value}
      </span>
    </div>
  );
}

function CategoryTab({
  label,
  emoji,
  count,
  active,
  cssVar,
  onClick,
}: {
  label: string;
  emoji?: string;
  count?: number;
  active: boolean;
  cssVar?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95"
      style={
        active
          ? {
              backgroundColor: cssVar ?? "var(--foreground)",
              color: "var(--background)",
              borderColor: cssVar ?? "var(--foreground)",
            }
          : {
              backgroundColor: "var(--background)",
              color: "var(--muted-foreground)",
              borderColor: "var(--border)",
            }
      }
    >
      {emoji && <span>{emoji}</span>}
      {label}
      {count !== undefined && (
        <span
          className="ml-0.5 rounded-full px-1 text-[10px] font-bold"
          style={{
            backgroundColor: active
              ? "rgba(255,255,255,0.25)"
              : "var(--muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
