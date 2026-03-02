"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  CheckCircle,
  Home,
} from "lucide-react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  markHubArticleRead,
  toggleHubBookmark,
  submitHubFeedback,
  getRelatedHubArticles,
} from "@/lib/actions/montessori-hub";
import {
  HUB_CATEGORY_CONFIG,
  HUB_AGE_BAND_CONFIG,
} from "@/lib/constants/montessori-hub";
import { HubArticleCard } from "./hub-article-card";
import type {
  HubArticleWithUserState,
  HubArticleSummary,
} from "@/types/domain";

interface HubArticleViewerProps {
  article: HubArticleWithUserState;
  canManage: boolean;
}

export function HubArticleViewer({
  article,
  canManage,
}: HubArticleViewerProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [bookmarked, setBookmarked] = useState(article.bookmarked);
  const [feedback, setFeedback] = useState<boolean | null>(article.feedback);
  const [helpfulCount, setHelpfulCount] = useState(article.helpful_count);
  const [notHelpfulCount, setNotHelpfulCount] = useState(
    article.not_helpful_count,
  );
  const [related, setRelated] = useState<HubArticleSummary[]>([]);

  const catCfg = HUB_CATEGORY_CONFIG[article.category];

  // Mark as read on mount
  useEffect(() => {
    if (!article.is_read) {
      markHubArticleRead({ article_id: article.id }).catch(() => {});
    }
    // Load related articles
    if (article.linked_keywords.length > 0) {
      getRelatedHubArticles(article.linked_keywords, 3).then((res) => {
        if (!res.error && res.data) {
          setRelated(res.data.filter((a) => a.id !== article.id));
        }
      });
    }
  }, [article.id, article.is_read, article.linked_keywords]);

  function handleBookmark() {
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

  function handleFeedback(helpful: boolean) {
    if (feedback === helpful) return; // already submitted
    const prev = feedback;
    setFeedback(helpful);
    if (helpful) {
      setHelpfulCount((c) => c + 1);
      if (prev === false) setNotHelpfulCount((c) => Math.max(0, c - 1));
    } else {
      setNotHelpfulCount((c) => c + 1);
      if (prev === true) setHelpfulCount((c) => Math.max(0, c - 1));
    }
    haptics.medium();
    startTransition(async () => {
      const result = await submitHubFeedback({
        article_id: article.id,
        helpful,
      });
      if (result.error) {
        setFeedback(prev);
        if (helpful) {
          setHelpfulCount((c) => Math.max(0, c - 1));
          if (prev === false) setNotHelpfulCount((c) => c + 1);
        } else {
          setNotHelpfulCount((c) => Math.max(0, c - 1));
          if (prev === true) setHelpfulCount((c) => c + 1);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-0 pb-tab-bar max-w-3xl mx-auto">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between gap-2 py-4 sticky top-0 bg-background border-b border-border z-10">
        <button
          onClick={() => {
            haptics.light();
            router.back();
          }}
          className="touch-target active-push flex items-center gap-1.5 text-sm rounded-lg px-2"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Hub</span>
        </button>

        <div className="flex items-center gap-2">
          {article.is_read && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--hub-status-published)" }}
            >
              <CheckCircle size={12} />
              Read
            </span>
          )}
          {canManage && (
            <button
              onClick={() => {
                haptics.light();
                router.push(`/pedagogy/montessori-hub/${article.slug}/edit`);
              }}
              className="touch-target active-push flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-border"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
          <button
            onClick={handleBookmark}
            disabled={isPending}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
            className="touch-target active-push flex items-center justify-center rounded-lg"
            style={{
              color: bookmarked
                ? "var(--hub-philosophy)"
                : "var(--muted-foreground)",
            }}
          >
            {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        </div>
      </div>

      {/* Article header */}
      <div className="flex flex-col gap-4 pt-6 pb-4">
        {/* Category */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              color: catCfg.cssVar,
              backgroundColor: `color-mix(in srgb, ${catCfg.cssVar} 12%, transparent)`,
            }}
          >
            {catCfg.emoji} {catCfg.label}
          </span>
          {article.age_bands.map((band) => (
            <span
              key={band}
              className="text-xs px-2 py-0.5 rounded border border-border"
              style={{ color: "var(--muted-foreground)" }}
            >
              {HUB_AGE_BAND_CONFIG[band].label}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-bold tracking-tight leading-snug">
          {article.title}
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {article.summary}
        </p>
      </div>

      {/* Key takeaways */}
      {article.key_takeaways.length > 0 && (
        <div
          className="rounded-xl p-4 flex flex-col gap-2 mb-6"
          style={{
            backgroundColor: `color-mix(in srgb, ${catCfg.cssVar} 8%, transparent)`,
            borderLeft: `3px solid ${catCfg.cssVar}`,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: catCfg.cssVar }}
          >
            Key Takeaways
          </p>
          <ul className="flex flex-col gap-1.5">
            {article.key_takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                  style={{ backgroundColor: catCfg.cssVar }}
                />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Article body - rendered as markdown-like prose */}
      <ArticleBody markdown={article.body_md} />

      {/* Home tips */}
      {article.home_tips.length > 0 && (
        <div className="mt-8 rounded-xl border border-border p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Home size={16} style={{ color: "var(--hub-home-connection)" }} />
            <h3
              className="font-semibold text-sm"
              style={{ color: "var(--hub-home-connection)" }}
            >
              Try This at Home
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {article.home_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{
                    backgroundColor: "var(--hub-home-connection)",
                    color: "var(--background)",
                  }}
                >
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border">
        <p className="text-sm font-medium">Was this article helpful?</p>
        <div className="flex gap-3">
          <FeedbackButton
            icon={<ThumbsUp size={16} />}
            label="Yes"
            count={helpfulCount}
            active={feedback === true}
            activeColor="var(--hub-status-published)"
            onClick={() => handleFeedback(true)}
            disabled={isPending}
          />
          <FeedbackButton
            icon={<ThumbsDown size={16} />}
            label="Not really"
            count={notHelpfulCount}
            active={feedback === false}
            activeColor="var(--muted-foreground)"
            onClick={() => handleFeedback(false)}
            disabled={isPending}
          />
        </div>
        {feedback !== null && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Thanks for your feedback!
          </p>
        )}
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map((a) => (
              <HubArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Article body renderer ───────────────────────────────────────────────────────
// Renders markdown-ish body without a full md library - handles headings, bold,
// code blocks, lists, tables, and horizontal rules.

function ArticleBody({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-lg font-bold mt-6 mb-2">
          {inlineMarkdown(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold mt-4 mb-1">
          {inlineMarkdown(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // HR
    if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    // Table (| prefix)
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={key++} lines={tableLines} />);
      continue;
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-none flex flex-col gap-1 my-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-40" />
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="flex flex-col gap-1 my-2 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 bg-foreground text-background">
                {idx + 1}
              </span>
              <span className="pt-0.5">{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} className="text-sm leading-relaxed my-1">
        {inlineMarkdown(line)}
      </p>,
    );
    i++;
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter(
      (l) =>
        !l
          .replace(/\|/g, "")
          .trim()
          .match(/^[-\s]+$/),
    )
    .map((l) =>
      l
        .split("|")
        .filter((_, i, a) => i > 0 && i < a.length - 1)
        .map((cell) => cell.trim()),
    );

  const [header, ...body] = rows;
  if (!header) return null;

  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: "var(--muted)" }}>
            {header.map((cell, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold border-b border-border"
              >
                {inlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-border">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-sm">
                  {inlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inline markdown: **bold**, *italic*, `code`
function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={k++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={k++}>{match[3]}</em>);
    else if (match[4])
      parts.push(
        <code
          key={k++}
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: "var(--muted)" }}
        >
          {match[4]}
        </code>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function FeedbackButton({
  icon,
  label,
  count,
  active,
  activeColor,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium transition-all active:scale-95 touch-target"
      style={
        active
          ? {
              borderColor: activeColor,
              color: activeColor,
              backgroundColor: `color-mix(in srgb, ${activeColor} 10%, transparent)`,
            }
          : { color: "var(--muted-foreground)" }
      }
    >
      {icon}
      {label}
      {count > 0 && <span className="text-xs opacity-60">{count}</span>}
    </button>
  );
}
