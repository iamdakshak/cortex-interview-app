import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Bold, Italic, List, ListOrdered, Code2, Code, Quote, Link2, Heading2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCode, isFormattable } from "@/lib/format";

const lowlight = createLowlight(common);
// highlight.js ships JSX/TSX support inside its javascript/typescript grammars
// but doesn't export them as separate language ids, so alias them here. Without
// this, CodeBlockLowlight sees `language-tsx` as unknown and falls back to plain
// text — which is what made JSX in code blocks look "escaped" instead of highlighted.
lowlight.registerAlias({ typescript: ["tsx"], javascript: ["jsx"] });

const CODE_LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "tsx", label: "TSX" },
  { value: "jsx", label: "JSX" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
];

interface EditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Rich-text editor with automatic code-block detection. Pasting multi-line
 * code or typing ```js creates a syntax-highlighted code block.
 */
export function RichEditor({ value, onChange, placeholder, className }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "tsx" }),
      Placeholder.configure({ placeholder: placeholder ?? "Write here…" }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // Auto-format every code block when the editor loses focus. Running on blur
    // (rather than on every keystroke) keeps the cursor and typing flow intact
    // while still guaranteeing saved content is always prettified.
    onBlur: ({ editor }) => {
      formatAllCodeBlocks(editor).catch((err) => console.warn("auto-format failed", err));
    },
    editorProps: {
      attributes: {
        class: "prose-content prose-sm max-w-none px-3 py-2",
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const alreadyInCodeBlock = editor?.isActive("codeBlock") ?? false;

        if (alreadyInCodeBlock) {
          // Let default paste (plain-text into code block) happen, then format.
          setTimeout(() => {
            if (editor) formatActiveCodeBlock(editor).catch(() => {});
          }, 0);
          return false;
        }

        if (looksLikeCode(text)) {
          event.preventDefault();
          const lang = guessLanguage(text);
          editor?.chain().focus().setCodeBlock({ language: lang }).insertContent(text).run();
          setTimeout(() => {
            if (editor) formatActiveCodeBlock(editor).catch(() => {});
          }, 0);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value || "", false);
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    cn("h-8 w-8", active && "bg-accent text-accent-foreground");
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote">
        <Quote className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("code"))}
        onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Inline code">
        <Code className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Code block">
        <Code2 className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn(editor.isActive("link"))}
        onClick={() => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
        aria-label="Link">
        <Link2 className="h-3.5 w-3.5" />
      </Button>
      <CodeBlockControls editor={editor} />
    </div>
  );
}

function CodeBlockControls({ editor }: { editor: Editor }) {
  const [formatting, setFormatting] = useState(false);
  if (!editor.isActive("codeBlock")) return null;

  const lang = (editor.getAttributes("codeBlock").language as string | undefined) ?? "tsx";

  const setLang = (value: string) => {
    editor.chain().focus().updateAttributes("codeBlock", { language: value }).run();
    // Re-format under the new language (e.g. switching js→tsx re-parses JSX properly).
    setTimeout(() => formatActiveCodeBlock(editor).catch(() => {}), 0);
  };

  const format = async () => {
    setFormatting(true);
    try {
      await formatActiveCodeBlock(editor);
    } finally {
      setFormatting(false);
    }
  };

  return (
    <>
      <div className="mx-1 h-5 w-px bg-border" aria-hidden />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Code block language"
      >
        {CODE_LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
        onClick={format}
        disabled={formatting || !isFormattable(lang)}
        title={isFormattable(lang) ? "Format with Prettier" : "No formatter for this language"}
        aria-label="Format code">
        <Wand2 className={cn("h-3.5 w-3.5", formatting && "animate-pulse")} />
      </Button>
    </>
  );
}

// Walk up from the current selection to the enclosing codeBlock node, run its
// text through Prettier, and replace the block's contents in place.
async function formatActiveCodeBlock(editor: Editor) {
  const { $from } = editor.state.selection;
  let blockPos = -1;
  let blockLang = "tsx";
  let blockText = "";
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "codeBlock") {
      blockPos = $from.before(depth);
      blockLang = (node.attrs.language as string | undefined) ?? "tsx";
      blockText = node.textContent;
      break;
    }
  }
  if (blockPos < 0 || !blockText.trim()) return;

  const formatted = await formatCode(blockText, blockLang);
  if (formatted === blockText) return;

  // Re-resolve the block from the live doc — it may have shifted during the
  // async prettier call if the user typed elsewhere.
  replaceCodeBlockAt(editor, blockPos, blockText, formatted);
}

// Format every code block in the document. Used as a blur-time auto-format so
// saved content is always prettified without any manual action.
async function formatAllCodeBlocks(editor: Editor) {
  const blocks: Array<{ pos: number; text: string; lang: string }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock" && node.textContent.trim()) {
      blocks.push({
        pos,
        text: node.textContent,
        lang: (node.attrs.language as string | undefined) ?? "tsx",
      });
    }
  });
  if (blocks.length === 0) return;

  const results = await Promise.all(
    blocks.map(async (b) => ({ ...b, formatted: await formatCode(b.text, b.lang) })),
  );
  const changed = results.filter((r) => r.formatted !== r.text);
  if (changed.length === 0) return;

  // Apply end-to-start so earlier positions remain valid while we rewrite.
  changed.sort((a, b) => b.pos - a.pos);
  editor
    .chain()
    .command(({ tr, state }) => {
      for (const b of changed) {
        // Re-resolve each block on the current state — in parallel-format mode
        // the first replace may have shifted later positions.
        const mapped = tr.mapping.map(b.pos);
        const node = state.doc.nodeAt(mapped) ?? tr.doc.nodeAt(mapped);
        if (!node || node.type.name !== "codeBlock" || node.textContent !== b.text) continue;
        const from = mapped + 1;
        const to = from + node.content.size;
        if (b.formatted.length === 0) tr.delete(from, to);
        else tr.replaceWith(from, to, state.schema.text(b.formatted));
      }
      return true;
    })
    .run();
}

function replaceCodeBlockAt(editor: Editor, originalPos: number, originalText: string, formatted: string) {
  editor
    .chain()
    .command(({ tr, state }) => {
      const node = state.doc.nodeAt(originalPos);
      if (!node || node.type.name !== "codeBlock" || node.textContent !== originalText) return false;
      const from = originalPos + 1;
      const to = from + node.content.size;
      if (formatted.length === 0) tr.delete(from, to);
      else tr.replaceWith(from, to, state.schema.text(formatted));
      return true;
    })
    .run();
}

// Heuristics for "should I treat this paste as a code block?"
function looksLikeCode(text: string): boolean {
  if (!text || text.length < 12) return false;
  const lines = text.split("\n");
  if (lines.length < 2) return false;
  const signals = [
    /^(function|const|let|var|class|import|export|if|for|while|return|def|public|private)\b/m,
    /[{};]\s*$/m,
    /=>\s*[{(]/,
    /^\s{2,}\S/m, // indented code
    /^#include|^package\s|^using\s/m,
    /<\/?[A-Za-z][\w-]*(\s[^>]*)?\/?>/, // tag — catches JSX/HTML pastes
  ];
  const hits = signals.filter((r) => r.test(text)).length;
  return hits >= 2;
}

function guessLanguage(text: string): string {
  if (/\bimport\s.+from\s+['"]react['"]/.test(text) || /<[A-Z]\w*/.test(text)) return "tsx";
  // Lowercase tags + JS-ish syntax → JSX fragment rather than pure HTML.
  if (/<\/?[a-z][\w-]*/.test(text) && /(\bconst\b|\blet\b|=>|\{[^}]*\})/.test(text)) return "tsx";
  if (/^\s*(interface|type)\s+\w+\s*=|:\s*(string|number|boolean)/.test(text)) return "typescript";
  if (/^(#include|int main|std::)/.test(text)) return "cpp";
  if (/^(def |class .+:|import )/m.test(text)) return "python";
  if (/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text)) return "sql";
  if (/<\/?\w+>/.test(text)) return "html";
  if (/\{[^}]*:[^}]*;[^}]*\}/.test(text) && !/function|=>/.test(text)) return "css";
  return "javascript";
}
