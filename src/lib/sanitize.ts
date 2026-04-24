import DOMPurify from "dompurify";

/**
 * Sanitize HTML before dangerouslySetInnerHTML. Allows Shiki-generated
 * <pre class="shiki"> trees (inline style + span tokens) and standard
 * rich-text tags from TipTap.
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["style", "class"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}
