import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;
let pending: Promise<Highlighter> | null = null;

const LANGS = ["javascript", "typescript", "tsx", "jsx", "html", "css", "json", "bash", "python", "java", "sql"];

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (pending) return pending;
  pending = createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: LANGS,
  }).then((h) => {
    highlighter = h;
    pending = null;
    return h;
  });
  return pending;
}

/**
 * Post-process an HTML string: find every <pre><code class="language-xx"> and
 * replace its inner text with Shiki-rendered tokens. Works on any TipTap /
 * lowlight / prism-style markup.
 */
export async function highlightHtml(html: string, theme: "light" | "dark"): Promise<string> {
  if (!html) return html;
  const h = await getHighlighter();
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return html;

  const blocks = root.querySelectorAll("pre > code");
  blocks.forEach((codeEl) => {
    const className = codeEl.getAttribute("class") ?? "";
    const match = className.match(/language-([\w+-]+)/);
    const lang = normalizeLang(match?.[1]);
    const source = codeEl.textContent ?? "";
    if (!source.trim()) return;
    try {
      const highlighted = h.codeToHtml(source, {
        lang,
        theme: theme === "dark" ? "github-dark" : "github-light",
      });
      const pre = codeEl.parentElement;
      if (pre) pre.outerHTML = highlighted;
    } catch {
      // Unknown language — leave original markup in place.
    }
  });

  return root.innerHTML;
}

function normalizeLang(raw: string | undefined): string {
  if (!raw) return "javascript";
  const l = raw.toLowerCase();
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  if (l === "py") return "python";
  if (l === "sh" || l === "shell") return "bash";
  if (LANGS.includes(l)) return l;
  return "javascript";
}
