"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { runTransform, parseAST } from "@/lib/transform-engine";
import type { AstNode } from "@/lib/transform-engine";
import { EXAMPLES } from "@/lib/examples";
import { AstExplorer } from "@/components/ast/ast-explorer";

// Monaco must be loaded client-side only — no SSR
const CodeEditor = dynamic(
  () => import("@/components/editor/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div style={{ background: "#0d1117", flex: 1 }} /> }
);

// ── URL hash encoding ────────────────────────────────────────────────────────

function encodeHash(source: string, transform: string): string {
  return encodeURIComponent(JSON.stringify({ s: source, t: transform }));
}

function decodeHash(hash: string): { source: string; transform: string } | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed.s === "string" && typeof parsed.t === "string") {
      return { source: parsed.s, transform: parsed.t };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const DEFAULT_SOURCE = EXAMPLES[0].source;
const DEFAULT_TRANSFORM = EXAMPLES[0].transform;

export function Studio() {
  // Initialise from URL hash if present, else fall back to first example
  const initialState = (() => {
    if (typeof window !== "undefined") {
      const fromHash = decodeHash(window.location.hash);
      if (fromHash) return fromHash;
    }
    return { source: DEFAULT_SOURCE, transform: DEFAULT_TRANSFORM };
  })();

  const [source, setSource] = useState(initialState.source);
  const [transform, setTransform] = useState(initialState.transform);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const [activeExample, setActiveExample] = useState(EXAMPLES[0].id);
  const [copied, setCopied] = useState(false);
  const [rightPane, setRightPane] = useState<"output" | "ast">("output");
  const [astData, setAstData] = useState<{ ast: AstNode | null; error: string | null }>({ ast: null, error: null });
  // Track whether current state came from a shared hash (to skip example highlight)
  const fromHash = useRef(typeof window !== "undefined" && !!decodeHash(window.location.hash));

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

  // Auto-run on change (debounced) + update URL hash + refresh AST
  useEffect(() => {
    const t = setTimeout(() => {
      runCode();
      window.location.hash = encodeHash(source, transform);
      if (rightPane === "ast") {
        const result = parseAST(source);
        setAstData(result.ok ? { ast: result.ast, error: null } : { ast: null, error: result.error });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [source, transform, rightPane]);

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    fromHash.current = false;
    setActiveExample(id);
    setSource(ex.source);
    setTransform(ex.transform);
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${encodeHash(source, transform)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              border: `1px solid ${!fromHash.current && activeExample === ex.id ? "#00d4ff" : "#1e2732"}`,
              background: !fromHash.current && activeExample === ex.id ? "rgba(0,212,255,0.08)" : "transparent",
              color: !fromHash.current && activeExample === ex.id ? "#00d4ff" : "#64748b",
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            {ex.label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Status */}
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

          {/* AST toggle */}
          {(["output", "ast"] as const).map((pane) => (
            <button
              key={pane}
              onClick={() => {
                setRightPane(pane);
                if (pane === "ast") {
                  const result = parseAST(source);
                  setAstData(result.ok ? { ast: result.ast, error: null } : { ast: null, error: result.error });
                }
              }}
              style={{
                padding: "0.25rem 0.7rem",
                fontSize: "0.72rem",
                fontFamily: "monospace",
                border: `1px solid ${rightPane === pane ? "#00d4ff" : "#1e2732"}`,
                background: rightPane === pane ? "rgba(0,212,255,0.08)" : "transparent",
                color: rightPane === pane ? "#00d4ff" : "#64748b",
                cursor: "pointer",
                borderRadius: 3,
              }}
            >
              {pane === "output" ? "Output" : "AST"}
            </button>
          ))}

          {/* Share button */}
          <button
            onClick={copyShareLink}
            title="Copy shareable link"
            style={{
              padding: "0.25rem 0.8rem",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              border: `1px solid ${copied ? "#22c55e" : "#1e2732"}`,
              background: copied ? "rgba(34,197,94,0.08)" : "transparent",
              color: copied ? "#22c55e" : "#64748b",
              cursor: "pointer",
              borderRadius: 3,
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ copied!" : "⬡ share"}
          </button>
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

        {/* Output / AST */}
        <div style={{ overflow: "hidden", position: "relative" }}>
          {rightPane === "output" ? (
            <>
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
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.72rem", fontFamily: "monospace",
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                color: "#64748b", background: "#0d1117",
                borderBottom: "1px solid #1e2732", flexShrink: 0,
              }}>
                AST Explorer
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <AstExplorer ast={astData.ast} error={astData.error} />
              </div>
            </div>
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
        <span>jscodeshift runs in-browser</span>
        <span>•</span>
        <span>Auto-runs on edit · Share any codemod via URL</span>
        <span>•</span>
        <a href="https://github.com/RahulTinku/codemod-studio" target="_blank" rel="noopener noreferrer"
          style={{ color: "#475569" }}>
          GitHub ↗
        </a>
        <span>•</span>
        <a href="https://github.com/facebook/jscodeshift" target="_blank" rel="noopener noreferrer"
          style={{ color: "#475569" }}>
          jscodeshift docs ↗
        </a>
      </div>
    </div>
  );
}
