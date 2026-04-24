// Thin wrapper around Prettier's browser bundle. Plugins are dynamically
// imported on first use so the ~1MB bundle doesn't ship on initial load.

const LANG_TO_PARSER: Record<string, string> = {
  javascript: "babel",
  js: "babel",
  jsx: "babel",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  markdown: "markdown",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
};

export function isFormattable(lang: string): boolean {
  return lang.toLowerCase() in LANG_TO_PARSER;
}

export async function formatCode(source: string, lang: string): Promise<string> {
  const parser = LANG_TO_PARSER[lang.toLowerCase()];
  if (!parser) return source;

  const [prettier, babel, ts, estree, html, postcss, markdown, yaml] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/html"),
    import("prettier/plugins/postcss"),
    import("prettier/plugins/markdown"),
    import("prettier/plugins/yaml"),
  ]);

  try {
    const result = await prettier.format(source, {
      parser,
      plugins: [babel, ts, estree, html, postcss, markdown, yaml],
      printWidth: 100,
      tabWidth: 2,
      singleQuote: false,
      semi: true,
    });
    // Prettier always appends a trailing newline; strip it inside a code block
    // so the cursor doesn't land on an empty line.
    return result.replace(/\n$/, "");
  } catch (err) {
    console.warn("prettier format failed", err);
    return source;
  }
}
