import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_CODE = `// Write JS here — it runs in a sandboxed iframe.
// console.log / console.error / console.warn are captured.

function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("fib(10) =", fibonacci(10));
`;

interface LogEntry { level: "log" | "error" | "warn" | "info"; text: string; }

export default function Compiler() {
  const { theme } = useTheme();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const run = () => {
    setLogs([]);
    setRunning(true);

    // Build a fresh sandboxed iframe each run so the script starts clean.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    frameRef.current?.remove();
    frameRef.current = iframe;

    const html = `<!doctype html><html><body><script>
      (function() {
        const send = (level, args) => parent.postMessage({
          __repl: true, level,
          text: args.map(a => {
            try { return typeof a === 'string' ? a : JSON.stringify(a, null, 2); } catch { return String(a); }
          }).join(' ')
        }, '*');
        ['log','error','warn','info'].forEach(level => {
          const orig = console[level];
          console[level] = (...args) => { send(level, args); orig.apply(console, args); };
        });
        window.addEventListener('error', (e) => send('error', [e.message]));
        window.addEventListener('unhandledrejection', (e) => send('error', ['Unhandled rejection:', e.reason]));
        try {
          ${"\n"}${code}${"\n"}
          parent.postMessage({ __repl: true, level: 'done' }, '*');
        } catch (e) {
          send('error', [String(e && e.stack || e)]);
          parent.postMessage({ __repl: true, level: 'done' }, '*');
        }
      })();
    <\/script></body></html>`;

    const handler = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || !d.__repl) return;
      if (d.level === "done") {
        setRunning(false);
        window.removeEventListener("message", handler);
        return;
      }
      setLogs((prev) => [...prev, { level: d.level, text: d.text }]);
    };
    window.addEventListener("message", handler);

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">JavaScript Editor</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setCode("")}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
            <Button size="sm" onClick={run} disabled={running}><Play className="h-3.5 w-3.5" /> Run</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[45vh] sm:h-[55vh] lg:h-[60vh]">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Console</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No output yet. Hit Run.</p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.level === "error"
                      ? "text-destructive"
                      : l.level === "warn"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-foreground"
                  }
                >
                  <span className="opacity-60">{l.level}: </span>
                  <span className="whitespace-pre-wrap">{l.text}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
