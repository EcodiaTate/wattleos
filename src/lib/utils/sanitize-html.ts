// src/lib/utils/sanitize-html.ts
//
// Shared HTML sanitization utility using DOMPurify.
// Used to prevent XSS when rendering user-provided HTML
// (e.g., newsletter body_html).

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "br",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "blockquote",
  "pre",
  "code",
  "span",
  "div",
  "sub",
  "sup",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "style",
  "class",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "align",
  "valign",
];

/**
 * Sanitize HTML content, stripping all script tags, event handlers,
 * and dangerous attributes while keeping safe formatting HTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
