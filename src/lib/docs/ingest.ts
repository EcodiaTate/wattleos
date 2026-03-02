// src/lib/docs/ingest.ts
//
// ============================================================
// WattleOS V2 - Documentation Ingest Pipeline
// ============================================================
// Turns markdown documentation into searchable vector chunks.
//
// Pipeline: Markdown → structural chunking → embedding → upsert
//
// WHY structural chunking (not fixed-size): Markdown has natural
// boundaries (headings). Chunking on headings preserves semantic
// coherence - a chunk about "Marking a Student Late" stays intact
// rather than being split mid-paragraph. This dramatically improves
// retrieval quality because the LLM gets complete thoughts.
//
// WHY SHA-256 content hashing: Re-embedding is expensive ($0.02/1M
// tokens, but slow). We hash each doc's markdown and skip the entire
// embed+upsert cycle if the hash matches. Edit one doc? Only that
// doc gets re-processed. The rest are untouched.
//
// WHY admin client: The ingest pipeline runs as a background job
// or CLI script, not as a user action. It needs to bypass RLS to
// write to doc_sources and doc_chunks directly.
//
// USAGE:
//   import { ingestDocument, ingestBatch } from '@/lib/docs/ingest';
//   await ingestBatch(allDocs);  // called from a seed script or cron
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ChunkInput,
  DocCategory,
  IngestDocInput,
  IngestResult,
} from "@/types/ask-wattle";
import { createHash } from "crypto";

// ============================================================
// Configuration
// ============================================================

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_CHUNK_TOKENS = 512;
const MIN_CHUNK_TOKENS = 50;
const OVERLAP_SENTENCES = 2;
const BATCH_EMBED_SIZE = 96; // OpenAI supports up to 2048, but smaller batches are more resilient

// ============================================================
// Chunking Engine
// ============================================================

/**
 * Split markdown into semantically coherent chunks based on headings.
 *
 * Strategy:
 * 1. Split on H2/H3 boundaries (##/###)
 * 2. If a section exceeds MAX_CHUNK_TOKENS, split on paragraphs
 * 3. If a single paragraph exceeds MAX_CHUNK_TOKENS, split on sentences
 * 4. Add OVERLAP_SENTENCES from the previous chunk for continuity
 * 5. Attach the nearest heading to each chunk for context
 */
export function chunkMarkdown(
  markdown: string,
  pageTitle: string,
  category: DocCategory,
): ChunkInput[] {
  const lines = markdown.split("\n");
  const sections: Array<{ heading: string | null; lines: string[] }> = [];

  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: [...currentLines] });
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Don't forget the last section
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, lines: currentLines });
  }

  const chunks: ChunkInput[] = [];
  let chunkIndex = 0;
  let previousSentences: string[] = [];

  for (const section of sections) {
    const sectionText = section.lines.join("\n").trim();
    if (!sectionText) continue;

    const paragraphs = splitParagraphs(sectionText);
    let currentChunkParts: string[] = [];
    let currentTokens = 0;

    // Prepend overlap from previous chunk for continuity
    if (previousSentences.length > 0) {
      const overlap = previousSentences.join(" ");
      currentChunkParts.push(overlap);
      currentTokens += estimateTokens(overlap);
    }

    for (const paragraph of paragraphs) {
      const paraTokens = estimateTokens(paragraph);

      if (paraTokens > MAX_CHUNK_TOKENS) {
        // Paragraph too large - flush current, then split by sentences
        if (currentChunkParts.length > 0) {
          const content = currentChunkParts.join("\n\n");
          if (estimateTokens(content) >= MIN_CHUNK_TOKENS) {
            chunks.push(
              buildChunk(
                content,
                section.heading,
                chunkIndex++,
                pageTitle,
                category,
              ),
            );
            previousSentences = extractTrailingSentences(
              content,
              OVERLAP_SENTENCES,
            );
          }
          currentChunkParts = [];
          currentTokens = 0;
        }

        // Split oversized paragraph into sentence-level chunks
        const sentences = splitSentences(paragraph);
        let sentenceBuffer: string[] = [];
        let sentenceTokens = 0;

        for (const sentence of sentences) {
          const sTokens = estimateTokens(sentence);
          if (
            sentenceTokens + sTokens > MAX_CHUNK_TOKENS &&
            sentenceBuffer.length > 0
          ) {
            const content = sentenceBuffer.join(" ");
            chunks.push(
              buildChunk(
                content,
                section.heading,
                chunkIndex++,
                pageTitle,
                category,
              ),
            );
            previousSentences = sentenceBuffer.slice(-OVERLAP_SENTENCES);
            sentenceBuffer = [...previousSentences];
            sentenceTokens = estimateTokens(sentenceBuffer.join(" "));
          }
          sentenceBuffer.push(sentence);
          sentenceTokens += sTokens;
        }
        if (sentenceBuffer.length > 0) {
          const content = sentenceBuffer.join(" ");
          if (estimateTokens(content) >= MIN_CHUNK_TOKENS) {
            chunks.push(
              buildChunk(
                content,
                section.heading,
                chunkIndex++,
                pageTitle,
                category,
              ),
            );
            previousSentences = extractTrailingSentences(
              content,
              OVERLAP_SENTENCES,
            );
          }
        }
        continue;
      }

      if (
        currentTokens + paraTokens > MAX_CHUNK_TOKENS &&
        currentChunkParts.length > 0
      ) {
        // Flush current chunk
        const content = currentChunkParts.join("\n\n");
        if (estimateTokens(content) >= MIN_CHUNK_TOKENS) {
          chunks.push(
            buildChunk(
              content,
              section.heading,
              chunkIndex++,
              pageTitle,
              category,
            ),
          );
          previousSentences = extractTrailingSentences(
            content,
            OVERLAP_SENTENCES,
          );
        }
        currentChunkParts = [...previousSentences.map((s) => s)];
        currentTokens = estimateTokens(currentChunkParts.join(" "));
      }

      currentChunkParts.push(paragraph);
      currentTokens += paraTokens;
    }

    // Flush remaining
    if (currentChunkParts.length > 0) {
      const content = currentChunkParts.join("\n\n");
      if (estimateTokens(content) >= MIN_CHUNK_TOKENS) {
        chunks.push(
          buildChunk(
            content,
            section.heading,
            chunkIndex++,
            pageTitle,
            category,
          ),
        );
        previousSentences = extractTrailingSentences(
          content,
          OVERLAP_SENTENCES,
        );
      }
    }
  }

  return chunks;
}

function buildChunk(
  content: string,
  heading: string | null,
  chunkIndex: number,
  pageTitle: string,
  category: DocCategory,
): ChunkInput {
  const breadcrumbs = [pageTitle];
  if (heading) breadcrumbs.push(heading);

  return {
    heading,
    content: cleanMarkdown(content),
    chunk_index: chunkIndex,
    metadata: {
      breadcrumbs,
      page_title: pageTitle,
      tags: extractTags(content),
      audience: inferAudience(content, category),
    },
  };
}

// ============================================================
// Text Utilities
// ============================================================

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  // Split on sentence boundaries (period/question/exclamation followed by space or end)
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractTrailingSentences(text: string, count: number): string[] {
  const sentences = splitSentences(text);
  return sentences.slice(-count);
}

/** Rough token estimate: ~4 chars per token for English text */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Strip markdown formatting that doesn't help search quality */
function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "[code block]") // Replace code blocks with marker
    .replace(/`([^`]+)`/g, "$1") // Remove inline code backticks
    .replace(/!\[.*?\]\(.*?\)/g, "[image]") // Replace images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // Keep link text, drop URLs
    .replace(/^\s*[-*+]\s+/gm, "• ") // Normalize list markers
    .replace(/^\s*\d+\.\s+/gm, "• ") // Normalize ordered lists
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1") // Remove bold/italic
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}

/** Extract likely tags from content for metadata boosting */
function extractTags(content: string): string[] {
  const tags: string[] = [];
  const lower = content.toLowerCase();

  const tagPatterns: Array<{ pattern: RegExp; tag: string }> = [
    { pattern: /\battendance\b/, tag: "attendance" },
    { pattern: /\bobservation/, tag: "observations" },
    { pattern: /\bcurriculum\b/, tag: "curriculum" },
    { pattern: /\bmastery\b/, tag: "mastery" },
    { pattern: /\breport\b/, tag: "reports" },
    { pattern: /\bportfolio\b/, tag: "portfolios" },
    { pattern: /\benrollment\b/, tag: "enrollment" },
    { pattern: /\binvoic/, tag: "billing" },
    { pattern: /\btimesheet\b/, tag: "timesheets" },
    { pattern: /\bpermission/, tag: "permissions" },
    { pattern: /\bparent\b/, tag: "parent-portal" },
    { pattern: /\bphoto|video|media\b/, tag: "media" },
    { pattern: /\bxero|stripe|keypay\b/, tag: "integrations" },
    { pattern: /\boshc|before.school|after.school\b/, tag: "programs" },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(lower)) tags.push(tag);
  }

  return [...new Set(tags)];
}

/** Infer target audience from content and category */
function inferAudience(
  content: string,
  category: DocCategory,
): ("guide" | "parent" | "admin" | "all")[] {
  const lower = content.toLowerCase();

  // Explicit audience markers
  if (lower.includes("as an administrator") || lower.includes("admin settings"))
    return ["admin"];
  if (lower.includes("as a guide") || lower.includes("from the classroom"))
    return ["guide"];
  if (lower.includes("as a parent") || lower.includes("parent portal"))
    return ["parent"];

  // Category-based defaults
  const categoryAudience: Record<
    string,
    ("guide" | "parent" | "admin" | "all")[]
  > = {
    admin: ["admin"],
    billing: ["admin"],
    enrollment: ["admin"],
    "parent-portal": ["parent"],
    observations: ["guide"],
    curriculum: ["guide", "admin"],
    "getting-started": ["all"],
    troubleshooting: ["all"],
  };

  return categoryAudience[category] ?? ["all"];
}

// ============================================================
// Embedding via OpenAI API
// ============================================================

/**
 * Embed an array of text strings using OpenAI's embedding API.
 *
 * WHY OpenAI embeddings (not Anthropic): As of Feb 2026, Anthropic
 * doesn't have a first-party embedding model. OpenAI's
 * text-embedding-3-small is cheap ($0.02/1M tokens), fast, and
 * produces high-quality 1536-dim vectors. When Anthropic ships
 * embeddings, we swap this one function.
 */
async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for document embedding. " +
        "Set it in your environment variables.",
    );
  }

  const results: number[][] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += BATCH_EMBED_SIZE) {
    const batch = texts.slice(i, i + BATCH_EMBED_SIZE);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI embedding API error (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    // Sort by index to maintain order (API doesn't guarantee order)
    const sorted = data.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}

/** Embed a single query string (used at search time) */
export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}

// ============================================================
// Content Hashing
// ============================================================

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

// ============================================================
// Ingest: Single Document
// ============================================================

export async function ingestDocument(
  input: IngestDocInput,
): Promise<IngestResult> {
  const supabase = createSupabaseAdminClient();
  const contentHash = input.content_hash ?? hashContent(input.markdown);

  // Check if this doc already exists with the same content
  const { data: existing } = await supabase
    .from("doc_sources")
    .select("id, content_hash")
    .eq("slug", input.slug)
    .single();

  if (existing && existing.content_hash === contentHash) {
    return {
      source_id: existing.id,
      slug: input.slug,
      chunks_created: 0,
      skipped: true,
      reason: "Content unchanged (hash match)",
    };
  }

  // Upsert the source record
  const { data: source, error: sourceError } = await supabase
    .from("doc_sources")
    .upsert(
      {
        slug: input.slug,
        title: input.title,
        category: input.category,
        source_url: input.source_url ?? `/docs/${input.slug}`,
        content_hash: contentHash,
        is_active: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (sourceError || !source) {
    throw new Error(
      `Failed to upsert doc source "${input.slug}": ${sourceError?.message}`,
    );
  }

  // Delete existing chunks for this source (full replace on content change)
  await supabase.from("doc_chunks").delete().eq("source_id", source.id);

  // Chunk the markdown
  const chunks = chunkMarkdown(input.markdown, input.title, input.category);

  if (chunks.length === 0) {
    return {
      source_id: source.id,
      slug: input.slug,
      chunks_created: 0,
      skipped: false,
      reason: "No chunks generated (document may be too short)",
    };
  }

  // Embed all chunks
  const texts = chunks.map((c) => {
    // Prepend heading for better embedding context
    const prefix = c.heading ? `${c.heading}: ` : "";
    return `${prefix}${c.content}`;
  });

  const embeddings = await embedTexts(texts);

  // Insert chunks with embeddings
  const chunkRows = chunks.map((chunk, i) => ({
    source_id: source.id,
    chunk_index: chunk.chunk_index,
    heading: chunk.heading,
    content: chunk.content,
    token_count: estimateTokens(chunk.content),
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata,
  }));

  const { error: insertError } = await supabase
    .from("doc_chunks")
    .insert(chunkRows);

  if (insertError) {
    throw new Error(
      `Failed to insert chunks for "${input.slug}": ${insertError.message}`,
    );
  }

  return {
    source_id: source.id,
    slug: input.slug,
    chunks_created: chunks.length,
    skipped: false,
  };
}

// ============================================================
// Ingest: Batch (all docs at once)
// ============================================================

export async function ingestBatch(docs: IngestDocInput[]): Promise<{
  results: IngestResult[];
  errors: Array<{ slug: string; error: string }>;
}> {
  const results: IngestResult[] = [];
  const errors: Array<{ slug: string; error: string }> = [];

  for (const doc of docs) {
    try {
      const result = await ingestDocument(doc);
      results.push(result);

      const status = result.skipped
        ? "⏭️  skipped"
        : `✅ ${result.chunks_created} chunks`;
      console.log(`[ingest] ${doc.slug}: ${status}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ slug: doc.slug, error: message });
      console.error(`[ingest] ❌ ${doc.slug}: ${message}`);
    }
  }

  console.log(
    `\n[ingest] Complete: ${results.length} processed, ${errors.length} failed, ` +
      `${results.filter((r) => r.skipped).length} skipped (unchanged)`,
  );

  return { results, errors };
}
