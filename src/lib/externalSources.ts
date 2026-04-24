import type { Question } from "@/types";

/**
 * Curated public GitHub repos with interview Q&A. All MIT-licensed or equivalent.
 * Each source produces a normalized Question[]. Run at click-time, cache in memory.
 */

interface Source {
  id: string;
  label: string;
  topicSlug: Question["topicSlug"];
  fetch: () => Promise<Question[]>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Parse a README that uses the common pattern:
 *   ### N. Question here
 *   ... answer ...
 *   ### N+1. Next question
 */
function parseQAReadme(md: string, baseUrl: string, topicSlug: string): Question[] {
  const out: Question[] = [];
  const lines = md.split("\n");
  let current: { title: string; body: string[] } | null = null;
  const push = () => {
    if (!current || !current.title) return;
    const idSlug = current.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    out.push({
      id: `ext-${topicSlug}-${idSlug}-${out.length}`,
      title: current.title,
      question: `<p>${escapeHtml(current.title)}</p>`,
      answer: markdownToHtml(current.body.join("\n")),
      topicSlug,
      difficulty: "medium",
      authorId: null,
      isPublic: true,
      createdAt: new Date().toISOString(),
      tags: ["external"],
      sourceUrl: baseUrl,
    });
  };
  for (const line of lines) {
    const m = line.match(/^#{2,4}\s+(?:\d+\.\s*)?(.+?)\s*$/);
    if (m && /\?$/.test(m[1])) {
      push();
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  push();
  return out.slice(0, 80); // cap per repo
}

// Minimal markdown → HTML just enough for rendering Q&A answers.
function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre><code class="language-${lang || "javascript"}">${escapeHtml(code)}</code></pre>`;
    });
  const html = escaped
    .split(/\n{2,}/)
    .map((para) => {
      if (/^<pre>/.test(para)) return para;
      if (/^\s*[-*]\s/.test(para)) {
        const items = para.split("\n").map((l) => l.replace(/^\s*[-*]\s/, "").trim()).filter(Boolean);
        return `<ul>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`;
      }
      if (/^\s*\d+\.\s/.test(para)) {
        const items = para.split("\n").map((l) => l.replace(/^\s*\d+\.\s/, "").trim()).filter(Boolean);
        return `<ol>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ol>`;
      }
      return `<p>${inline(para.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
  return html;

  function inline(s: string): string {
    return s
      .replace(/`([^`]+)`/g, (_m, c) => `<code>${escapeHtml(c)}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const EXTERNAL_SOURCES: Source[] = [
  {
    id: "sudheerj-javascript",
    label: "sudheerj / javascript-interview-questions",
    topicSlug: "javascript",
    fetch: async () => {
      const url = "https://raw.githubusercontent.com/sudheerj/javascript-interview-questions/master/README.md";
      return parseQAReadme(await fetchText(url), "https://github.com/sudheerj/javascript-interview-questions", "javascript");
    },
  },
  {
    id: "sudheerj-react",
    label: "sudheerj / reactjs-interview-questions",
    topicSlug: "react",
    fetch: async () => {
      const url = "https://raw.githubusercontent.com/sudheerj/reactjs-interview-questions/master/README.md";
      return parseQAReadme(await fetchText(url), "https://github.com/sudheerj/reactjs-interview-questions", "react");
    },
  },
  {
    id: "h5bp-frontend",
    label: "h5bp / Front-end-Developer-Interview-Questions",
    topicSlug: "html",
    fetch: async () => {
      const url = "https://raw.githubusercontent.com/h5bp/Front-end-Developer-Interview-Questions/main/src/questions/general-questions.md";
      const md = await fetchText(url);
      // h5bp lists questions as "- Question..." rather than Q/A. Use title only, empty answer.
      const items = md.split("\n").map((l) => l.match(/^[-*]\s+(.+\?)$/)?.[1]).filter(Boolean) as string[];
      return items.slice(0, 60).map((q, i) => ({
        id: `ext-h5bp-${i}`,
        title: q,
        question: `<p>${escapeHtml(q)}</p>`,
        answer: `<p class="text-muted-foreground">This source only lists questions. Use it to quiz yourself — then add the answer via the editor if you're an admin.</p>`,
        topicSlug: "html",
        difficulty: "medium",
        authorId: null,
        isPublic: true,
        createdAt: new Date().toISOString(),
        tags: ["external"],
        sourceUrl: "https://github.com/h5bp/Front-end-Developer-Interview-Questions",
      }));
    },
  },
];
