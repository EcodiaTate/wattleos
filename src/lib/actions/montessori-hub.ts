"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success, paginated, paginatedFailure } from "@/types/api";
import type { ActionResponse, PaginatedResponse } from "@/types/api";
import type {
  HubArticle,
  HubArticleWithUserState,
  HubArticleSummary,
  HubDashboardData,
  HubArticleRead,
  HubArticleCategory,
} from "@/types/domain";
import {
  CreateHubArticleSchema,
  UpdateHubArticleSchema,
  ListHubArticlesSchema,
  MarkHubArticleReadSchema,
  ToggleHubBookmarkSchema,
  SubmitHubFeedbackSchema,
} from "@/lib/validations/montessori-hub";
import type {
  CreateHubArticleInput,
  UpdateHubArticleInput,
  ListHubArticlesFilter,
  MarkHubArticleReadInput,
  ToggleHubBookmarkInput,
  SubmitHubFeedbackInput,
} from "@/lib/validations/montessori-hub";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapSummary(
  row: Record<string, unknown>,
  readMap: Map<string, { bookmarked: boolean }>
): HubArticleSummary {
  const id = row.id as string;
  const readState = readMap.get(id);
  return {
    id,
    title: row.title as string,
    slug: row.slug as string,
    category: row.category as HubArticleCategory,
    age_bands: (row.age_bands as string[]) as HubArticleSummary["age_bands"],
    status: row.status as HubArticleSummary["status"],
    summary: row.summary as string,
    tenant_id: (row.tenant_id as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    sort_order: row.sort_order as number,
    is_read: !!readState,
    bookmarked: readState?.bookmarked ?? false,
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getHubDashboard(): Promise<ActionResponse<HubDashboardData>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    // All published articles (platform + tenant)
    const { data: articles, error: articlesErr } = await db
      .from("montessori_hub_articles")
      .select(
        "id, title, slug, category, age_bands, status, summary, tenant_id, published_at, sort_order"
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });

    if (articlesErr) return failure(articlesErr.message, "DB_ERROR");

    // Current user's read/bookmark state
    const { data: reads, error: readsErr } = await db
      .from("montessori_hub_reads")
      .select("article_id, bookmarked")
      .eq("tenant_id", ctx.tenant.id)
      .eq("user_id", ctx.user.id);

    if (readsErr) return failure(readsErr.message, "DB_ERROR");

    const readMap = new Map<string, { bookmarked: boolean }>(
      (reads ?? []).map((r) => [r.article_id, { bookmarked: r.bookmarked }])
    );

    const all = (articles ?? []) as Record<string, unknown>[];
    const summaries = all.map((r) => mapSummary(r, readMap));

    // Group by category
    const categoryMap = new Map<HubArticleCategory, HubArticleSummary[]>();
    for (const s of summaries) {
      const existing = categoryMap.get(s.category) ?? [];
      existing.push(s);
      categoryMap.set(s.category, existing);
    }

    const by_category = Array.from(categoryMap.entries())
      .map(([category, arts]) => ({ category, count: arts.length, articles: arts }))
      .sort((a, b) => a.articles[0].sort_order - b.articles[0].sort_order);

    const recent = summaries
      .filter((s) => s.published_at)
      .sort((a, b) => (b.published_at! > a.published_at! ? 1 : -1))
      .slice(0, 6);

    const bookmarks = summaries.filter((s) => s.bookmarked);

    return success({
      total_articles: summaries.length,
      published_articles: summaries.length,
      articles_read_by_user: readMap.size,
      bookmarked_by_user: bookmarks.length,
      by_category,
      recent,
      bookmarks,
    });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── List Articles ─────────────────────────────────────────────────────────────

export async function listHubArticles(
  input: ListHubArticlesFilter = {}
): Promise<PaginatedResponse<HubArticleSummary>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = ListHubArticlesSchema.safeParse(input);
    if (!parsed.success) return paginatedFailure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { category, age_band, status, search, bookmarked_only, page, per_page } = parsed.data;

    // Build read map first if filtering by bookmark
    const { data: reads } = await db
      .from("montessori_hub_reads")
      .select("article_id, bookmarked")
      .eq("tenant_id", ctx.tenant.id)
      .eq("user_id", ctx.user.id);

    const readMap = new Map<string, { bookmarked: boolean }>(
      (reads ?? []).map((r) => [r.article_id, { bookmarked: r.bookmarked }])
    );

    let query = db
      .from("montessori_hub_articles")
      .select(
        "id, title, slug, category, age_bands, status, summary, tenant_id, published_at, sort_order",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "published");
    }

    if (category) query = query.eq("category", category);

    if (age_band) {
      query = query.contains("age_bands", [age_band]);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,summary.ilike.%${search}%`
      );
    }

    const from = (page - 1) * per_page;
    query = query.range(from, from + per_page - 1);

    const { data, error, count } = await query;
    if (error) return paginatedFailure(error.message, "DB_ERROR");

    let summaries = (data ?? []).map((r) =>
      mapSummary(r as unknown as Record<string, unknown>, readMap)
    );

    if (bookmarked_only) {
      summaries = summaries.filter((s) => s.bookmarked);
    }

    return paginated(summaries, count ?? summaries.length, page, per_page);
  } catch (e) {
    return paginatedFailure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Get Single Article ─────────────────────────────────────────────────────────

export async function getHubArticle(
  articleId: string
): Promise<ActionResponse<HubArticleWithUserState>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const { data: article, error: artErr } = await db
      .from("montessori_hub_articles")
      .select("*")
      .eq("id", articleId)
      .is("deleted_at", null)
      .single();

    if (artErr || !article) return failure("Article not found", "NOT_FOUND");

    // User read/bookmark state
    const { data: readRow } = await db
      .from("montessori_hub_reads")
      .select("bookmarked, read_at")
      .eq("tenant_id", ctx.tenant.id)
      .eq("article_id", articleId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    // User feedback
    const { data: feedbackRow } = await db
      .from("montessori_hub_feedback")
      .select("helpful")
      .eq("tenant_id", ctx.tenant.id)
      .eq("article_id", articleId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    // Aggregate feedback counts
    const { data: counts } = await db
      .from("montessori_hub_feedback")
      .select("helpful")
      .eq("article_id", articleId);

    const helpful_count = (counts ?? []).filter((c) => c.helpful).length;
    const not_helpful_count = (counts ?? []).filter((c) => !c.helpful).length;

    const art = article as unknown as HubArticle;

    return success({
      ...art,
      is_read: !!readRow,
      bookmarked: readRow?.bookmarked ?? false,
      feedback: feedbackRow ? feedbackRow.helpful : null,
      helpful_count,
      not_helpful_count,
    });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Get Article by Slug ────────────────────────────────────────────────────────

export async function getHubArticleBySlug(
  slug: string
): Promise<ActionResponse<HubArticleWithUserState>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const { data: article, error: artErr } = await db
      .from("montessori_hub_articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();

    if (artErr || !article) return failure("Article not found", "NOT_FOUND");

    return getHubArticle(article.id);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Mark Article Read ──────────────────────────────────────────────────────────

export async function markHubArticleRead(
  input: MarkHubArticleReadInput
): Promise<ActionResponse<HubArticleRead>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = MarkHubArticleReadSchema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { article_id, bookmarked } = parsed.data;

    const upsertData: Record<string, unknown> = {
      tenant_id: ctx.tenant.id,
      article_id,
      user_id: ctx.user.id,
      read_at: new Date().toISOString(),
    };
    if (bookmarked !== undefined) upsertData.bookmarked = bookmarked;

    const { data, error } = await db
      .from("montessori_hub_reads")
      .upsert(upsertData, { onConflict: "tenant_id,article_id,user_id" })
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    return success(data as unknown as HubArticleRead);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Toggle Bookmark ────────────────────────────────────────────────────────────

export async function toggleHubBookmark(
  input: ToggleHubBookmarkInput
): Promise<ActionResponse<{ bookmarked: boolean }>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = ToggleHubBookmarkSchema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { article_id, bookmarked } = parsed.data;

    const { error } = await db
      .from("montessori_hub_reads")
      .upsert(
        {
          tenant_id: ctx.tenant.id,
          article_id,
          user_id: ctx.user.id,
          bookmarked,
          read_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,article_id,user_id" }
      );

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: bookmarked
        ? AuditActions.HUB_ARTICLE_BOOKMARKED
        : AuditActions.HUB_ARTICLE_UNBOOKMARKED,
      entityType: "montessori_hub_reads",
      entityId: article_id,
      metadata: { article_id },
    });

    return success({ bookmarked });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Submit Feedback ────────────────────────────────────────────────────────────

export async function submitHubFeedback(
  input: SubmitHubFeedbackInput
): Promise<ActionResponse<{ helpful: boolean }>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = SubmitHubFeedbackSchema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { article_id, helpful } = parsed.data;

    const { error } = await db
      .from("montessori_hub_feedback")
      .upsert(
        {
          tenant_id: ctx.tenant.id,
          article_id,
          user_id: ctx.user.id,
          helpful,
        },
        { onConflict: "tenant_id,article_id,user_id" }
      );

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.HUB_ARTICLE_FEEDBACK_SUBMITTED,
      entityType: "montessori_hub_feedback",
      entityId: article_id,
      metadata: { helpful },
    });

    return success({ helpful });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Admin: Create Article ──────────────────────────────────────────────────────

export async function createHubArticle(
  input: CreateHubArticleInput
): Promise<ActionResponse<HubArticle>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = CreateHubArticleSchema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("montessori_hub_articles")
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenant.id,
        author_id: ctx.user.id,
        published_at:
          parsed.data.status === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return failure("An article with that slug already exists", "ALREADY_EXISTS");
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context: ctx,
      action: AuditActions.HUB_ARTICLE_CREATED,
      entityType: "montessori_hub_articles",
      entityId: (data as { id: string }).id,
      metadata: { title: parsed.data.title, category: parsed.data.category },
    });

    return success(data as unknown as HubArticle);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Admin: Update Article ──────────────────────────────────────────────────────

export async function updateHubArticle(
  input: UpdateHubArticleInput
): Promise<ActionResponse<HubArticle>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const parsed = UpdateHubArticleSchema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { id, ...fields } = parsed.data;

    const updateFields: Record<string, unknown> = { ...fields };

    // Set published_at if transitioning to published
    if (fields.status === "published") {
      // Only set if not already set
      const { data: existing } = await db
        .from("montessori_hub_articles")
        .select("published_at, status")
        .eq("id", id)
        .single();
      if (existing && existing.status !== "published" && !existing.published_at) {
        updateFields.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await db
      .from("montessori_hub_articles")
      .update(updateFields)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");
    if (!data) return failure("Article not found or access denied", "NOT_FOUND");

    await logAudit({
      context: ctx,
      action: AuditActions.HUB_ARTICLE_UPDATED,
      entityType: "montessori_hub_articles",
      entityId: id,
      metadata: { updated_fields: Object.keys(fields) },
    });

    return success(data as unknown as HubArticle);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Admin: Delete Article (soft) ───────────────────────────────────────────────

export async function deleteHubArticle(
  articleId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("montessori_hub_articles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", articleId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.HUB_ARTICLE_DELETED,
      entityType: "montessori_hub_articles",
      entityId: articleId,
      metadata: {},
    });

    return success({ id: articleId });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}

// ── Contextual Link Helper ─────────────────────────────────────────────────────
// Used from observation/portfolio pages to surface relevant articles

export async function getRelatedHubArticles(
  keywords: string[],
  limit = 3
): Promise<ActionResponse<HubArticleSummary[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_MONTESSORI_HUB);
    const db = await createSupabaseServerClient();

    if (!keywords.length) return success([]);

    const { data, error } = await db
      .from("montessori_hub_articles")
      .select(
        "id, title, slug, category, age_bands, status, summary, tenant_id, published_at, sort_order"
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .overlaps("linked_keywords", keywords)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error) return failure(error.message, "DB_ERROR");

    const { data: reads } = await db
      .from("montessori_hub_reads")
      .select("article_id, bookmarked")
      .eq("tenant_id", ctx.tenant.id)
      .eq("user_id", ctx.user.id);

    const readMap = new Map<string, { bookmarked: boolean }>(
      (reads ?? []).map((r) => [r.article_id, { bookmarked: r.bookmarked }])
    );

    const summaries = (data ?? []).map((r) =>
      mapSummary(r as unknown as Record<string, unknown>, readMap)
    );

    return success(summaries);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Unexpected error", "UNEXPECTED_ERROR");
  }
}
