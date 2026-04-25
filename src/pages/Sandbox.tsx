import { useEffect, useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

// Sandpack's editorHeight is a JS prop, not a CSS value, so we have to compute
// it from a media query rather than using Tailwind breakpoints.
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

const DEFAULT_APP = `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>React Sandbox</h1>
      <p>Edit the code and see results live.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
}
`;

export default function Sandbox() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>React Sandbox</CardTitle>
          <CardDescription>
            Full React playground powered by Sandpack. Install deps, edit files, and the preview hot-reloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <Sandpack
            template="react"
            theme={theme === "dark" ? "dark" : "light"}
            files={{ "/App.js": DEFAULT_APP }}
            options={{
              // Drop the file navigator on mobile — its tabs alone eat half the
              // viewport. Editor height shrinks too so the preview is reachable
              // without scrolling past three nested chrome bars.
              showNavigator: !isMobile,
              showLineNumbers: true,
              showInlineErrors: true,
              editorHeight: isMobile ? 360 : 600,
              wrapContent: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
