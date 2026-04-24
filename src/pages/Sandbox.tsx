import { Sandpack } from "@codesandbox/sandpack-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

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
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>React Sandbox</CardTitle>
          <CardDescription>
            Full React playground powered by Sandpack. Install deps, edit files, and the preview hot-reloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Sandpack
            template="react"
            theme={theme === "dark" ? "dark" : "light"}
            files={{ "/App.js": DEFAULT_APP }}
            options={{
              showNavigator: true,
              showLineNumbers: true,
              showInlineErrors: true,
              editorHeight: 600,
              wrapContent: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
