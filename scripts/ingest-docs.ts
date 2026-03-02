// scripts/ingest-docs.ts
//
// ============================================================
// WattleOS V2 - Documentation Ingest Script
// ============================================================
// Run this script to process all documentation markdown files
// and store them as searchable vector chunks in Supabase.
//
// USAGE:
//   npx tsx scripts/ingest-docs.ts
//   npx tsx scripts/ingest-docs.ts --force   # Re-embed everything
//   npx tsx scripts/ingest-docs.ts --dry-run  # Preview without writing
//
// DIRECTORY STRUCTURE:
//   src/content/docs/
//   ├── getting-started/
//   │   └── platform-overview.md        → category: getting-started
//   ├── curriculum/
//   │   ├── overview.md                 → category: curriculum
//   │   ├── primary/
//   │   │   ├── math-operations.md      → category: curriculum, sub: primary
//   │   │   └── language-arts.md        → category: curriculum, sub: primary
//   │   └── adolescent/
//   │       └── erdkinder.md            → category: curriculum, sub: adolescent
//   ├── attendance/
//   │   ├── roll-call.md                → category: attendance
//   │   └── kiosk/
//   │       └── setup.md                → category: attendance, sub: kiosk
//   └── troubleshooting/
//       └── common-issues.md            → category: troubleshooting
//
// The top-level directory becomes the category. Any nested directories
// become the subcategory (joined with "/"). The full relative path
// (minus .md) becomes the slug for deduplication and URL routing.
//
// PREREQUISITES:
//   - OPENAI_API_KEY in .env.local (for embeddings)
//   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
//   - pgvector extension enabled (see migration)
//
// WHY dotenv: This script runs via `npx tsx`, which is outside
// the Next.js runtime. Next.js auto-loads .env.local but tsx
// does not. We load it manually before any imports that read
// process.env.
// ============================================================

// ── Load environment FIRST, before anything reads process.env ──
import { config } from "dotenv";
config({ path: ".env.local" });

// Fallback: also try .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: ".env" });
}

// Validate required env vars early with clear errors
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:");
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error("\nMake sure these are set in .env.local");
  process.exit(1);
}

// ── Now safe to import modules that use process.env ──
import { readdir, readFile } from "fs/promises";
import { join, relative, basename } from "path";
import { ingestBatch } from "@/lib/docs/ingest";
import type { IngestDocInput, DocCategory } from "@/types/ask-wattle";

// ============================================================
// Configuration
// ============================================================

const DOCS_ROOT = join(process.cwd(), "src", "content", "docs");

const VALID_CATEGORIES: DocCategory[] = [
  "getting-started",
  "guides",
  "admin",
  "curriculum",
  "observations",
  "attendance",
  "reports",
  "communications",
  "billing",
  "programs",
  "enrollment",
  "parent-portal",
  "troubleshooting",
  "api",
  "general",
];

// ============================================================
// File Discovery - Recursive walk for unlimited nesting depth
// ============================================================

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      // Directory doesn't exist yet - not an error during discovery
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories (e.g. .git, .obsidian)
        if (entry.name.startsWith(".")) continue;
        // Skip common non-doc directories
        if (entry.name === "node_modules" || entry.name === "_drafts") continue;
        await walk(fullPath);
      } else if (entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files.sort();
}

// ============================================================
// Path → Category + Subcategory Resolution
// ============================================================

interface ParsedDocPath {
  /** Full slug for dedup and URL routing, e.g. "curriculum/primary/math-operations" */
  slug: string;
  /** Top-level category from VALID_CATEGORIES, e.g. "curriculum" */
  category: DocCategory;
  /** Nested path below category, e.g. "primary" or "primary/advanced". Null if at category root. */
  subcategory: string | null;
  /** Human-readable title derived from H1 or filename */
  title: string;
}

function resolveDocPath(filePath: string, content: string): ParsedDocPath {
  const relativePath = relative(DOCS_ROOT, filePath);

  // Normalise path separators (Windows uses backslash)
  const normalised = relativePath.replace(/\\/g, "/");
  const slug = normalised.replace(/\.md$/, "");

  // Split the path into segments: ["curriculum", "primary", "math-operations.md"]
  const segments = normalised.replace(/\.md$/, "").split("/");

  // ── Category: first segment, validated against allowed list ──
  const topLevelDir = segments.length > 1 ? segments[0] : "general";
  const category: DocCategory = VALID_CATEGORIES.includes(
    topLevelDir as DocCategory,
  )
    ? (topLevelDir as DocCategory)
    : "general";

  // ── Subcategory: everything between category dir and filename ──
  // e.g. "curriculum/primary/advanced/topic.md" → subcategory: "primary/advanced"
  let subcategory: string | null = null;
  if (segments.length > 2) {
    // segments[0] = category, segments[last] = filename, middle = subcategory
    const subParts = segments.slice(1, -1);
    subcategory = subParts.join("/");
  }

  // ── Title: first H1 in content, or humanised filename ──
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const fileName = basename(filePath, ".md");
  const title = titleMatch
    ? titleMatch[1].trim()
    : fileName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return { slug, category, subcategory, title };
}

// ============================================================
// File → IngestDocInput
// ============================================================

function parseDocFile(filePath: string, content: string): IngestDocInput {
  const { slug, category, subcategory, title } = resolveDocPath(
    filePath,
    content,
  );

  // Strip frontmatter if present (YAML between --- fences)
  const markdown = content.replace(/^---[\s\S]*?---\n*/, "");

  return {
    slug,
    title,
    category,
    subcategory,
    source_url: `/docs/${slug}`,
    markdown,
  };
}

// ============================================================
// Summary Helpers
// ============================================================

interface CategoryStats {
  count: number;
  subcategories: Map<string, number>;
}

function buildCategoryTree(docs: IngestDocInput[]): Map<string, CategoryStats> {
  const tree = new Map<string, CategoryStats>();

  for (const doc of docs) {
    const existing = tree.get(doc.category) ?? {
      count: 0,
      subcategories: new Map(),
    };
    existing.count++;

    if (doc.subcategory) {
      const subCount = existing.subcategories.get(doc.subcategory) ?? 0;
      existing.subcategories.set(doc.subcategory, subCount + 1);
    }

    tree.set(doc.category, existing);
  }

  return tree;
}

function printCategoryTree(tree: Map<string, CategoryStats>): void {
  const sorted = [...tree.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [category, stats] of sorted) {
    console.log(`  📁 ${category} (${stats.count} docs)`);

    if (stats.subcategories.size > 0) {
      const subSorted = [...stats.subcategories.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      );
      for (const [sub, count] of subSorted) {
        console.log(`     └─ ${sub} (${count})`);
      }
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  console.log("🌿 WattleOS Documentation Ingest");
  console.log("================================");
  console.log(`  Docs root:  ${DOCS_ROOT}`);
  console.log(`  Supabase:   ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(
    `  Force:      ${force ? "yes (re-embed everything)" : "no (skip unchanged)"}`,
  );
  console.log(
    `  Dry run:    ${dryRun ? "yes (preview only)" : "no (will write to DB)"}`,
  );
  console.log("");

  // 1. Discover all markdown files recursively
  const filePaths = await findMarkdownFiles(DOCS_ROOT);
  console.log(`📂 Found ${filePaths.length} documentation files\n`);

  if (filePaths.length === 0) {
    console.log("No .md files found in the docs directory.");
    console.log(`Expected location: ${DOCS_ROOT}`);
    console.log("\nCreate some docs first! Example structure:");
    console.log("  src/content/docs/getting-started/platform-overview.md");
    console.log("  src/content/docs/curriculum/primary/math-operations.md");
    console.log("  src/content/docs/curriculum/adolescent/erdkinder.md");
    console.log("  src/content/docs/attendance/kiosk/setup.md");
    console.log("  src/content/docs/observations/creating-observations.md");
    process.exit(0);
  }

  // 2. Parse all files into IngestDocInput
  const docs: IngestDocInput[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath, "utf-8");
    const doc = parseDocFile(filePath, content);
    docs.push(doc);

    if (dryRun) {
      const subLabel = doc.subcategory ? ` → ${doc.subcategory}` : "";
      console.log(`  [${doc.category}${subLabel}] ${doc.slug}`);
      console.log(`    Title: ${doc.title}`);
      console.log(`    Chars: ${doc.markdown.length}`);
      console.log("");
    }
  }

  // 3. Print category tree (useful for both dry-run and real runs)
  const tree = buildCategoryTree(docs);
  console.log("📊 Category breakdown:");
  printCategoryTree(tree);
  console.log("");

  if (dryRun) {
    console.log(`🔍 Dry run complete. ${docs.length} docs would be ingested.`);
    process.exit(0);
  }

  // 4. Ingest
  console.log("⚡ Starting ingest pipeline...\n");

  if (force) {
    // Force mode: mutate hashes so every doc is treated as changed
    for (const doc of docs) {
      doc.content_hash = `force-${Date.now()}`;
    }
  }

  const { results, errors } = await ingestBatch(docs);

  // 5. Summary
  console.log("\n================================");
  console.log("📊 Ingest Summary");
  console.log("================================");
  console.log(`  Total docs:    ${docs.length}`);
  console.log(`  Processed:     ${results.filter((r) => !r.skipped).length}`);
  console.log(`  Skipped:       ${results.filter((r) => r.skipped).length}`);
  console.log(`  Failed:        ${errors.length}`);
  console.log(
    `  Total chunks:  ${results.reduce((sum, r) => sum + r.chunks_created, 0)}`,
  );

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const err of errors) {
      console.log(`  ${err.slug}: ${err.error}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Documentation is ready for Ask Wattle!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
