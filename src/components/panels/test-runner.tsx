"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { runTransform } from "@/lib/transform-engine";

const CodeEditor = dynamic(
  () => import("@/components/editor/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div style={{ background: "#0d1117", flex: 1, minHeight: 80 }} /> }
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TestCase {
  id: string;
  description: string;
  input: string;
  expected: string;
}

interface TestResult {
  id: string;
  passed: boolean;
  actual: string;
  error?: string;
}

// ── Comparison ────────────────────────────────────────────────────────────────

/** Normalise whitespace for comparison: trim each line, normalise EOL */
function normalise(code: string): string {
  return code
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

// ── Diff helper ───────────────────────────────────────────────────────────────

function renderDiff(expected: string, actual: string) {
  const expLines = expected.split("\n");
  const actLines = actual.split("\n");
  const maxLen = Math.max(expLines.length, actLines.length);

  return (
    <div style={{ fontFamily: "monospace", fontSize: "0.74rem", lineHeight: 1.6 }}>
      {Array.from({ length: maxLen }, (_, i) => {
        const e = expLines[i] ?? "";
        const a = actLines[i] ?? "";
        if (e === a) {
          return <div key={i} style={{ color: "#475569" }}>{" " + (e || " ")}</div>;
        }
        return (
          <div key={i}>
            {e !== "" && <div style={{ color: "#86efac", background: "rgba(134,239,172,0.06)" }}>{"+ " + e}</div>}
            {a !== "" && <div style={{ color: "#f87171", background: "rgba(248,113,113,0.06)" }}>{"- " + a}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Inline TestCase editor ────────────────────────────────────────────────────

interface TestCaseEditorProps {
  tc: TestCase;
  result?: TestResult;
  onUpdate: (updated: TestCase) => void;
  onRemove: () => void;
  index: number;
}

function TestCaseEditor({ tc, result, onUpdate, onRemove, index }: TestCaseEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  const statusColor = result
    ? result.passed ? "#22c55e" : "#ef4444"
    : "#64748b";

  const statusLabel = result
    ? result.passed ? "✓ pass" : "✗ fail"
    : "–";

  return (
    <div style={{
      border: `1px solid ${result ? (result.passed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)") : "#1e2732"}`,
      borderRadius: 4,
      marginBottom: "0.75rem",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.4rem 0.75rem",
          background: "#0d1117",
          cursor: "pointer", userSelect: "none",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <span style={{ color: "#64748b", fontSize: "0.68rem", fontFamily: "monospace" }}>
          {expanded ? "▾" : "▸"}
        </span>
        <span style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", flex: 1 }}>
          Test {index + 1}{tc.description ? `: ${tc.description}` : ""}
        </span>
        <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: statusColor }}>
          {statusLabel}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none", border: "none", color: "#475569",
            cursor: "pointer", fontSize: "0.8rem", padding: "0 4px",
          }}
          title="Remove test"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0.5rem 0.75rem 0.75rem" }}>
          {/* Description */}
          <input
            value={tc.description}
            onChange={(e) => onUpdate({ ...tc, description: e.target.value })}
            placeholder="Test description (optional)"
            style={{
              width: "100%", marginBottom: "0.5rem",
              background: "#080c18", border: "1px solid #1e2732",
              borderRadius: 3, color: "#94a3b8",
              fontFamily: "monospace", fontSize: "0.75rem",
              padding: "0.3rem 0.5rem",
              boxSizing: "border-box" as const,
            }}
          />
          {/* Input / Expected */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#475569", marginBottom: 4 }}>
                INPUT
              </div>
              <div style={{ height: 120, border: "1px solid #1e2732", borderRadius: 3, overflow: "hidden" }}>
                <CodeEditor
                  value={tc.input}
                  onChange={(v) => onUpdate({ ...tc, input: v })}
                  language="typescript"
                  height="100%"
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#475569", marginBottom: 4 }}>
                EXPECTED OUTPUT
              </div>
              <div style={{ height: 120, border: "1px solid #1e2732", borderRadius: 3, overflow: "hidden" }}>
                <CodeEditor
                  value={tc.expected}
                  onChange={(v) => onUpdate({ ...tc, expected: v })}
                  language="typescript"
                  height="100%"
                />
              </div>
            </div>
          </div>

          {/* Failure diff */}
          {result && !result.passed && (
            <div style={{ marginTop: "0.5rem" }}>
              <button
                onClick={() => setShowDiff((d) => !d)}
                style={{
                  background: "none", border: "1px solid #1e2732", color: "#64748b",
                  fontFamily: "monospace", fontSize: "0.7rem",
                  padding: "0.2rem 0.6rem", borderRadius: 3, cursor: "pointer",
                  marginBottom: "0.35rem",
                }}
              >
                {showDiff ? "Hide diff" : "Show diff"}
              </button>
              {showDiff && (
                <div style={{
                  background: "#080c18", border: "1px solid #1e2732",
                  borderRadius: 3, padding: "0.4rem 0.6rem",
                  maxHeight: 160, overflowY: "auto",
                }}>
                  {result.error
                    ? <div style={{ color: "#ef4444", fontFamily: "monospace", fontSize: "0.74rem" }}>{result.error}</div>
                    : renderDiff(normalise(tc.expected), normalise(result.actual))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main TestRunner panel ─────────────────────────────────────────────────────

interface TestRunnerProps {
  transform: string;
  tests: TestCase[];
  onTestsChange: (tests: TestCase[]) => void;
}

export function TestRunner({ transform, tests, onTestsChange }: TestRunnerProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [ran, setRan] = useState(false);

  const addTest = () => {
    onTestsChange([
      ...tests,
      { id: crypto.randomUUID(), description: "", input: "", expected: "" },
    ]);
  };

  const updateTest = (id: string, updated: TestCase) => {
    onTestsChange(tests.map((t) => (t.id === id ? updated : t)));
  };

  const removeTest = (id: string) => {
    onTestsChange(tests.filter((t) => t.id !== id));
    setResults((r) => r.filter((res) => res.id !== id));
  };

  const runTests = useCallback(() => {
    const newResults: TestResult[] = tests.map((tc) => {
      if (!tc.input.trim()) {
        return { id: tc.id, passed: false, actual: "", error: "Input is empty" };
      }
      const result = runTransform(tc.input, transform);
      if (!result.ok) {
        return { id: tc.id, passed: false, actual: "", error: result.error };
      }
      const passed = normalise(result.output) === normalise(tc.expected);
      return { id: tc.id, passed, actual: result.output };
    });
    setResults(newResults);
    setRan(true);
  }, [tests, transform]);

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#080c18" }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.5rem 1rem",
        background: "#0d1117", borderBottom: "1px solid #1e2732",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#64748b", flex: 1 }}>
          {tests.length} test{tests.length !== 1 ? "s" : ""}
          {ran && tests.length > 0 && (
            <span style={{ marginLeft: "0.75rem" }}>
              <span style={{ color: "#22c55e" }}>{passCount} pass</span>
              {failCount > 0 && <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>{failCount} fail</span>}
            </span>
          )}
        </span>
        <button
          onClick={addTest}
          style={{
            padding: "0.25rem 0.7rem", fontSize: "0.72rem", fontFamily: "monospace",
            border: "1px solid #1e2732", background: "transparent", color: "#64748b",
            cursor: "pointer", borderRadius: 3,
          }}
        >
          + Add test
        </button>
        <button
          onClick={runTests}
          disabled={tests.length === 0}
          style={{
            padding: "0.25rem 0.8rem", fontSize: "0.72rem", fontFamily: "monospace",
            border: "1px solid #00d4ff", background: "rgba(0,212,255,0.08)",
            color: tests.length === 0 ? "#1e2732" : "#00d4ff",
            cursor: tests.length === 0 ? "default" : "pointer", borderRadius: 3,
          }}
        >
          ▶ Run all
        </button>
      </div>

      {/* Test list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
        {tests.length === 0 && (
          <div style={{ color: "#475569", fontFamily: "monospace", fontSize: "0.78rem", paddingTop: "0.5rem" }}>
            No tests yet. Click "+ Add test" to define before/after pairs for your codemod.
          </div>
        )}
        {tests.map((tc, i) => (
          <TestCaseEditor
            key={tc.id}
            tc={tc}
            index={i}
            result={results.find((r) => r.id === tc.id)}
            onUpdate={(updated) => updateTest(tc.id, updated)}
            onRemove={() => removeTest(tc.id)}
          />
        ))}
      </div>
    </div>
  );
}
