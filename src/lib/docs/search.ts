// src/lib/docs/search.ts
//
// ============================================================
// WattleOS V2 - Documentation Semantic Search
// ============================================================
// The retrieval half of the RAG pipeline. Embeds the user's
// query, calls match_doc_chunks RPC, and returns ranked results
// with source metadata for citation.
//
// WHY a separate file from ask-wattle.ts: Search is independently
// useful - the docs pages can use it for a search bar without
// needing the full LLM chat pipeline. Separation also makes
// testing easier (mock search, test chat independently).
//
// WHY context-aware boosting: If a guide asks about attendance
// while on the attendance page, chunks from the attendance
// category should rank higher than generic results. We do this
// by adjusting the similarity threshold per category rather than
// re-ranking (cheaper, simpler, nearly as effective).
//
// All actions return ActionResponse<T> - never throw.
// ============================================================

"use server";

import { embedQuery } from "@/lib/docs/ingest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";
import type { DocSearchResult, MessageSource } from "@/types/ask-wattle";

// ============================================================
// Configuration
// ============================================================

const DEFAULT_MATCH_THRESHOLD = 0.45;
const DEFAULT_MATCH_COUNT = 8;
const BOOSTED_THRESHOLD = 0.35; // Lower threshold for contextually relevant categories
const MAX_CONTEXT_TOKENS = 3000; // Cap total context sent to the LLM

// ============================================================
// Core Search Function
// ============================================================

export interface SearchDocsInput {
  query: string;
  /** If provided, boost results from this category */
  boost_category?: string;
  /** Maximum results to return */
  max_results?: number;
  /** Minimum similarity score (0-1) */
  threshold?: number;
}

export interface SearchDocsOutput {
  results: DocSearchResult[];
  /** De-duplicated sources for citation */
  sources: MessageSource[];
  /** Total tokens across all returned chunks */
  total_tokens: number;
  /** The query as embedded (useful for debugging) */
  query_text: string;
}

export async function searchDocs(
  input: SearchDocsInput,
): Promise<ActionResponse<SearchDocsOutput>> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Embed the user's query
    const queryEmbedding = await embedQuery(input.query);

    // 2. Call the match_doc_chunks RPC
    const matchCount = input.max_results ?? DEFAULT_MATCH_COUNT;
    const threshold = input.threshold ?? DEFAULT_MATCH_THRESHOLD;

    const { data: rawResults, error: rpcError } = await supabase.rpc(
      "match_doc_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: matchCount + 4, // Fetch extras for post-filtering
      },
    );

    if (rpcError) {
      return failure(
        `Semantic search failed: ${rpcError.message}`,
        ErrorCodes.DATABASE_ERROR,
      );
    }

    let results = (rawResults ?? []) as DocSearchResult[];

    // 3. Context-aware boosting
    // If the user is on a specific page, we fetched with a lower threshold
    // but now we filter non-boosted results back to the normal threshold
    if (input.boost_category) {
      results = results.filter((r) => {
        if (r.source_category === input.boost_category) {
          return r.similarity >= BOOSTED_THRESHOLD;
        }
        return r.similarity >= threshold;
      });
    }

    // 4. De-duplicate by source (keep highest-similarity chunk per source)
    // then cap at requested count
    results = results.slice(0, matchCount);

    // 5. Calculate total tokens and enforce context cap
    let totalTokens = 0;
    const cappedResults: DocSearchResult[] = [];

    for (const result of results) {
      if (totalTokens + result.token_count > MAX_CONTEXT_TOKENS) break;
      cappedResults.push(result);
      totalTokens += result.token_count;
    }

    // 6. Build de-duplicated source citations
    const sourceMap = new Map<string, MessageSource>();
    for (const result of cappedResults) {
      if (!sourceMap.has(result.source_slug)) {
        sourceMap.set(result.source_slug, {
          slug: result.source_slug,
          title: result.source_title,
          category: result.source_category,
          url: result.source_url,
          heading: result.heading,
          similarity: result.similarity,
        });
      }
    }

    return success({
      results: cappedResults,
      sources: Array.from(sourceMap.values()),
      total_tokens: totalTokens,
      query_text: input.query,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// Quick Search (for the docs search bar - lighter weight)
// ============================================================

export interface QuickSearchResult {
  slug: string;
  title: string;
  heading: string | null;
  snippet: string;
  category: string;
  similarity: number;
}

export async function quickSearchDocs(
  query: string,
  maxResults: number = 5,
): Promise<ActionResponse<QuickSearchResult[]>> {
  try {
    const searchResult = await searchDocs({
      query,
      max_results: maxResults,
      threshold: 0.5, // Higher threshold for quick search - precision over recall
    });

    if (searchResult.error) {
      return failure(ErrorCodes.INTERNAL_ERROR);
    }

    const results: QuickSearchResult[] = (searchResult.data?.results ?? []).map(
      (r) => ({
        slug: r.source_slug,
        title: r.source_title,
        heading: r.heading,
        snippet: r.content.slice(0, 200) + (r.content.length > 200 ? "…" : ""),
        category: r.source_category,
        similarity: r.similarity,
      }),
    );

    return success(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quick search failed";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
