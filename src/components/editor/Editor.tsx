import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Bold, Italic, List, ListOrdered, Code2, Code, Quote, Link2, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

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
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "javascript" }),
      Placeholder.configure({ placeholder: placeholder ?? "Write here…" }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-content prose-sm max-w-none px-3 py-2",
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (looksLikeCode(text)) {
          event.preventDefault();
          const lang = guessLanguage(text);
          editor?.chain().focus().setCodeBlock({ language: lang }).insertContent(text).run();
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
    </div>
  );
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
  ];
  const hits = signals.filter((r) => r.test(text)).length;
  return hits >= 2;
}

function guessLanguage(text: string): string {
  if (/\bimport\s.+from\s+['"]react['"]/.test(text) || /<[A-Z]\w*/.test(text)) return "tsx";
  if (/^\s*(interface|type)\s+\w+\s*=|:\s*(string|number|boolean)/.test(text)) return "typescript";
  if (/^(#include|int main|std::)/.test(text)) return "cpp";
  if (/^(def |class .+:|import )/m.test(text)) return "python";
  if (/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text)) return "sql";
  if (/<\/?\w+>/.test(text)) return "html";
  if (/\{[^}]*:[^}]*;[^}]*\}/.test(text) && !/function|=>/.test(text)) return "css";
  return "javascript";
}
