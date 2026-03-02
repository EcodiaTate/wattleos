"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createHubArticle,
  updateHubArticle,
  deleteHubArticle,
} from "@/lib/actions/montessori-hub";
import type { CreateHubArticleInput } from "@/lib/validations/montessori-hub";
import {
  HUB_CATEGORY_CONFIG,
  HUB_AGE_BAND_CONFIG,
  HUB_CATEGORY_DISPLAY_ORDER,
} from "@/lib/constants/montessori-hub";
import type { HubArticle, HubArticleCategory, HubArticleAgeBand, HubArticleStatus } from "@/types/domain";

interface HubArticleFormProps {
  article?: HubArticle;
}

export function HubArticleForm({ article }: HubArticleFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [category, setCategory] = useState<HubArticleCategory>(article?.category ?? "philosophy");
  const [ageBands, setAgeBands] = useState<HubArticleAgeBand[]>(article?.age_bands ?? ["all_ages"]);
  const [status, setStatus] = useState<HubArticleStatus>(article?.status ?? "draft");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [bodyMd, setBodyMd] = useState(article?.body_md ?? "");
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(article?.key_takeaways ?? [""]);
  const [homeTips, setHomeTips] = useState<string[]>(article?.home_tips ?? [""]);
  const [keywords, setKeywords] = useState((article?.linked_keywords ?? []).join(", "));
  const [sortOrder, setSortOrder] = useState(article?.sort_order ?? 0);

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!article) setSlug(autoSlug(value));
  }

  function toggleAgeBand(band: HubArticleAgeBand) {
    haptics.light();
    setAgeBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }

  function handleSubmit() {
    setError(null);
    haptics.heavy();
    startTransition(async () => {
      const keywordsArr = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const takeaways = keyTakeaways.filter(Boolean);
      const tips = homeTips.filter(Boolean);

      if (article) {
        const result = await updateHubArticle({
          id: article.id,
          title,
          slug,
          category,
          age_bands: ageBands,
          status,
          summary,
          body_md: bodyMd,
          key_takeaways: takeaways,
          home_tips: tips,
          linked_keywords: keywordsArr,
          sort_order: sortOrder,
        });
        if (result.error) { setError(result.error.message); return; }
        router.push(`/pedagogy/montessori-hub/${slug}`);
      } else {
        const createInput: CreateHubArticleInput = {
          title,
          slug,
          category: category as CreateHubArticleInput["category"],
          age_bands: ageBands as CreateHubArticleInput["age_bands"],
          status: status as CreateHubArticleInput["status"],
          summary,
          body_md: bodyMd,
          key_takeaways: takeaways,
          home_tips: tips,
          linked_area_ids: [],
          linked_keywords: keywordsArr,
          sort_order: sortOrder,
        };
        const result = await createHubArticle(createInput);
        if (result.error) { setError(result.error.message); return; }
        router.push(`/pedagogy/montessori-hub/${slug}`);
      }
    });
  }

  function handleDelete() {
    if (!article) return;
    haptics.heavy();
    startTransition(async () => {
      const result = await deleteHubArticle(article.id);
      if (result.error) { setError(result.error.message); return; }
      router.push("/pedagogy/montessori-hub");
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-tab-bar max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{article ? "Edit Article" : "New Article"}</h1>
        {article && (
          <div className="flex gap-2">
            {confirmDelete ? (
              <>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="touch-target px-3 py-1.5 rounded-lg text-sm border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="touch-target px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
                >
                  Confirm Delete
                </button>
              </>
            ) : (
              <button
                onClick={() => { haptics.light(); setConfirmDelete(true); }}
                className="touch-target px-3 py-1.5 rounded-lg text-sm border border-border"
                style={{ color: "var(--destructive)" }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "var(--destructive-muted)", color: "var(--destructive)" }}>
          {error}
        </div>
      )}

      {/* Title */}
      <Field label="Title" required>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. What is the Three-Period Lesson?"
          className="field-input"
        />
      </Field>

      {/* Slug */}
      <Field label="Slug" hint="URL-safe identifier (auto-generated from title)">
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. three-period-lesson"
          className="field-input font-mono text-sm"
        />
      </Field>

      {/* Category + Status row */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" required>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HubArticleCategory)}
            className="field-input"
          >
            {HUB_CATEGORY_DISPLAY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {HUB_CATEGORY_CONFIG[cat].emoji} {HUB_CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" required>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as HubArticleStatus)}
            className="field-input"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </div>

      {/* Age bands */}
      <Field label="Age Bands" required hint="Select all that apply">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HUB_AGE_BAND_CONFIG) as HubArticleAgeBand[]).map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => toggleAgeBand(band)}
              className="px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95"
              style={
                ageBands.includes(band)
                  ? { backgroundColor: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" }
                  : { backgroundColor: "var(--background)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
              }
            >
              {HUB_AGE_BAND_CONFIG[band].shortLabel}
            </button>
          ))}
        </div>
      </Field>

      {/* Summary */}
      <Field label="Summary" required hint="1–3 sentences shown on article cards (max 500 chars)">
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A concise overview of what this article covers..."
          className="field-input resize-none"
        />
        <span className="text-xs mt-1" style={{ color: summary.length > 450 ? "var(--destructive)" : "var(--muted-foreground)" }}>
          {summary.length} / 500
        </span>
      </Field>

      {/* Body */}
      <Field label="Article Body (Markdown)" required>
        <textarea
          rows={20}
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          placeholder="Write the article content in Markdown..."
          className="field-input resize-y font-mono text-xs"
        />
      </Field>

      {/* Key Takeaways */}
      <Field label="Key Takeaways" hint="Up to 5 bullet points shown before the article body">
        <div className="flex flex-col gap-2">
          {keyTakeaways.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={t}
                onChange={(e) => {
                  const next = [...keyTakeaways];
                  next[i] = e.target.value;
                  setKeyTakeaways(next);
                }}
                placeholder={`Takeaway ${i + 1}`}
                className="field-input flex-1"
              />
              {keyTakeaways.length > 1 && (
                <button
                  type="button"
                  onClick={() => setKeyTakeaways(keyTakeaways.filter((_, j) => j !== i))}
                  className="touch-target px-2 rounded-lg border border-border text-xs"
                  style={{ color: "var(--destructive)" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {keyTakeaways.length < 5 && (
            <button
              type="button"
              onClick={() => setKeyTakeaways([...keyTakeaways, ""])}
              className="text-xs text-left px-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              + Add takeaway
            </button>
          )}
        </div>
      </Field>

      {/* Home Tips */}
      <Field label="Home Tips" hint="Practical suggestions for families (up to 8)">
        <div className="flex flex-col gap-2">
          {homeTips.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={t}
                onChange={(e) => {
                  const next = [...homeTips];
                  next[i] = e.target.value;
                  setHomeTips(next);
                }}
                placeholder={`Tip ${i + 1}`}
                className="field-input flex-1"
              />
              {homeTips.length > 1 && (
                <button
                  type="button"
                  onClick={() => setHomeTips(homeTips.filter((_, j) => j !== i))}
                  className="touch-target px-2 rounded-lg border border-border text-xs"
                  style={{ color: "var(--destructive)" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {homeTips.length < 8 && (
            <button
              type="button"
              onClick={() => setHomeTips([...homeTips, ""])}
              className="text-xs text-left px-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              + Add tip
            </button>
          )}
        </div>
      </Field>

      {/* Keywords */}
      <Field label="Linked Keywords" hint="Comma-separated keywords for contextual linking from observations/portfolios">
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g. three period lesson, introduction, recall"
          className="field-input"
        />
      </Field>

      {/* Sort Order */}
      <Field label="Sort Order" hint="Lower numbers appear first (0 = top)">
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="field-input w-24"
        />
      </Field>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            router.back();
          }}
          className="touch-target active-push px-4 py-2 rounded-xl border border-border text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !title || !slug || !summary || !bodyMd || ageBands.length === 0}
          className="touch-target active-push flex-1 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--foreground)", color: "var(--background)" }}
        >
          {isPending ? "Saving…" : article ? "Save Changes" : "Publish Article"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{hint}</p>
      )}
      {children}
    </div>
  );
}
