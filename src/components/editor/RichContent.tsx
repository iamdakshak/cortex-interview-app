import { useEffect, useState } from "react";
import { highlightHtml } from "@/lib/shiki";
import { sanitize } from "@/lib/sanitize";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Renders sanitized HTML with Shiki-highlighted code blocks. Feed it the
 * raw TipTap output (or seed-question HTML) and it handles both.
 */
export function RichContent({ html, className }: { html: string; className?: string }) {
  const { theme } = useTheme();
  const [rendered, setRendered] = useState<string>(() => sanitize(html));

  useEffect(() => {
    let cancelled = false;
    highlightHtml(html, theme)
      .then((result) => {
        if (!cancelled) setRendered(sanitize(result));
      })
      .catch(() => {
        if (!cancelled) setRendered(sanitize(html));
      });
    return () => {
      cancelled = true;
    };
  }, [html, theme]);

  return <div className={className ? `prose-content ${className}` : "prose-content"} dangerouslySetInnerHTML={{ __html: rendered }} />;
}
