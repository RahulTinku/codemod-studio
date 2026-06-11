"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { runTransform } from "@/lib/transform-engine";
import { EXAMPLES } from "@/lib/examples";

// Monaco must be loaded client-side only — no SSR
const CodeEditor = dynamic(
  () => import("@/components/editor/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div style={{ background: "#0d1117", flex: 1 }} /> }
);

const DEFAULT_SOURCE = EXAMPLES[0].source;
const DEFAULT_TRANSFORM = EXAMPLES[0].transform;

export function Studio() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const [activeExample, setActiveExample] = useState(EXAMPLES[0].id);

  const runCode = useCallback(() => {
    const result = runTransform(source, transform);
    if (result.ok) {
      setOutput(result.output);
      setUnchanged(result.unchanged);
      setError(null);
    } else {
      setError(result.error);
      setOutput("");
    }
  }, [source, transform]);

  // Run on mount
  useEffect(() => { runCode(); }, []);

  // Auto-run on change (debounced)
  useEffect(() => {
    const t = setTimeout(runCode, 400);
    return () => clearTimeout(t);
  }, [source, transform]);

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setActiveExample(id);
    setSource(ex.source);
    setTransform(ex.transform);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080c18", color: "#cbd5e1" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.6rem 1.2rem",
        background: "#0d1117",
        borderBottom: "1px solid #1e2732",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#00d4ff", fontWeight: 700 }}>
          codemod-studio
        </span>
        <span style={{ color: "#1e2732" }}>│</span>
        <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>Examples:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => loadExample(ex.id)}
            title={ex.description}
            style={{
              padding: "0.25rem 0.7rem",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              border: `1px solid ${activeExample === ex.id ? "#00d4ff" : "#1e2732"}`,
              background: activeExample === ex.id ? "rgba(0,212,255,0.08)" : "transparent",
              color: activeExample === ex.id ? "#00d4ff" : "#64748b",
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {ex.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {error && (
            <span style={{ fontSize: "0.72rem", color: "#ef4444", fontFamily: "monospace" }}>
              ✗ {error.slice(0, 60)}{error.length > 60 ? "…" : ""}
            </span>
          )}
          {!error && unchanged && (
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
              (no changes)
            </span>
          )}
          {!error && !unchanged && output && (
            <span style={{ fontSize: "0.72rem", color: "#22c55e", fontFamily: "monospace" }}>
              ✓ transformed
            </span>
          )}
        </div>
      </div>

      {/* Three-pane editor */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>
        {/* Source */}
        <div style={{ borderRight: "1px solid #1e2732", overflow: "hidden" }}>
          <CodeEditor
            label="Source"
            value={source}
            onChange={setSource}
            language="typescript"
          />
        </div>

        {/* Transform */}
        <div style={{ borderRight: "1px solid #1e2732", overflow: "hidden" }}>
          <CodeEditor
            label="Transform (jscodeshift)"
            value={transform}
            onChange={setTransform}
            language="javascript"
          />
        </div>

        {/* Output */}
        <div style={{ overflow: "hidden", position: "relative" }}>
          <CodeEditor
            label={error ? "Error" : "Output"}
            value={error ? `// Error:\n// ${error.replace(/\n/g, "\n// ")}` : output}
            language="typescript"
            readOnly
          />
          {error && (
            <div style={{
              position: "absolute", top: 30, left: 0, right: 0, bottom: 0,
              background: "rgba(239,68,68,0.04)",
              pointerEvents: "none",
            }} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "0.4rem 1.2rem",
        background: "#0d1117",
        borderTop: "1px solid #1e2732",
        display: "flex", gap: "1.5rem",
        fontSize: "0.68rem", fontFamily: "monospace", color: "#475569",
        flexShrink: 0,
      }}>
        <span>jscodeshift runs in-browser via Web Worker</span>
        <span>•</span>
        <span>Transforms auto-run on edit (400ms debounce)</span>
        <span>•</span>
        <a href="https://github.com/facebook/jscodeshift" target="_blank" rel="noopener noreferrer"
          style={{ color: "#475569" }}>
          jscodeshift docs ↗
        </a>
      </div>
    </div>
  );
}
