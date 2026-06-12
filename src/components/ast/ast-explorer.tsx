"use client";

import { useState } from "react";
import type { AstNode } from "@/lib/transform-engine";

// ── Colour tokens ─────────────────────────────────────────────────────────────

const C = {
  key: "#94a3b8",
  nodeType: "#00d4ff",
  string: "#86efac",
  number: "#fbbf24",
  bool: "#f472b6",
  null: "#64748b",
  brace: "#64748b",
  toggle: "#1e2732",
};

// ── Primitive value renderer ──────────────────────────────────────────────────

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span style={{ color: C.null }}>null</span>;
  }
  if (typeof value === "string") {
    return <span style={{ color: C.string }}>"{value}"</span>;
  }
  if (typeof value === "number") {
    return <span style={{ color: C.number }}>{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span style={{ color: C.bool }}>{String(value)}</span>;
  }
  return <span style={{ color: C.null }}>{String(value)}</span>;
}

// ── Recursive tree node ───────────────────────────────────────────────────────

interface TreeNodeProps {
  label?: string;
  value: unknown;
  depth: number;
  defaultOpen?: boolean;
}

function TreeNode({ label, value, depth, defaultOpen = false }: TreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);

  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isPrimitive = !isObject && !isArray;

  const indent = depth * 16;

  if (isPrimitive) {
    return (
      <div style={{ paddingLeft: indent, lineHeight: "1.6", fontFamily: "monospace", fontSize: "0.78rem" }}>
        {label && <span style={{ color: C.key }}>{label}: </span>}
        <PrimitiveValue value={value} />
      </div>
    );
  }

  const obj = value as Record<string, unknown>;
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(obj);

  const nodeType = !isArray && typeof obj.type === "string" ? obj.type : null;
  const preview = nodeType
    ? `<${nodeType}>`
    : isArray
    ? `[${entries.length}]`
    : `{${entries.length}}`;

  return (
    <div style={{ paddingLeft: indent }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          padding: "1px 0", lineHeight: "1.6",
          fontFamily: "monospace", fontSize: "0.78rem",
          userSelect: "none",
        }}
      >
        <span style={{
          display: "inline-block", width: 12, textAlign: "center",
          color: C.brace, fontSize: "0.65rem",
        }}>
          {open ? "▾" : "▸"}
        </span>
        {label && <span style={{ color: C.key }}>{label}: </span>}
        {nodeType ? (
          <span style={{ color: C.nodeType }}>{nodeType}</span>
        ) : (
          <span style={{ color: C.brace }}>{preview}</span>
        )}
        {!open && !nodeType && (
          <span style={{ color: C.brace, fontSize: "0.7rem", marginLeft: 4 }}>…</span>
        )}
      </div>

      {open && entries.map(([k, v]) => {
        if (k === "type" && nodeType) return null; // already shown in header
        return (
          <TreeNode
            key={k}
            label={isArray ? undefined : k}
            value={v}
            depth={depth + 1}
            defaultOpen={false}
          />
        );
      })}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface AstExplorerProps {
  ast: AstNode | null;
  error: string | null;
}

export function AstExplorer({ ast, error }: AstExplorerProps) {
  return (
    <div style={{
      height: "100%", overflowY: "auto", overflowX: "hidden",
      background: "#0d1117", padding: "12px 8px",
    }}>
      {error && (
        <div style={{ color: "#ef4444", fontFamily: "monospace", fontSize: "0.78rem", padding: "0 8px" }}>
          {error}
        </div>
      )}
      {ast && !error && (
        <TreeNode value={ast} depth={0} defaultOpen />
      )}
      {!ast && !error && (
        <div style={{ color: "#475569", fontFamily: "monospace", fontSize: "0.78rem", padding: "0 8px" }}>
          Parse source to see the AST.
        </div>
      )}
    </div>
  );
}
