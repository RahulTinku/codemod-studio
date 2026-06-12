"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { generateScaffold, downloadFile } from "@/lib/export-scaffold";

const CodeEditor = dynamic(
  () => import("@/components/editor/code-editor").then((m) => m.CodeEditor),
  { ssr: false, loading: () => <div style={{ background: "#0d1117", flex: 1, minHeight: 80 }} /> }
);

interface ExportModalProps {
  transform: string;
  onClose: () => void;
}

export function ExportModal({ transform, onClose }: ExportModalProps) {
  const files = generateScaffold(transform);
  const [activeFile, setActiveFile] = useState(files[0].path);

  const current = files.find((f) => f.path === activeFile) ?? files[0];

  const langMap: Record<string, string> = {
    javascript: "javascript",
    json: "json",
    markdown: "markdown",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #1e2732",
          borderRadius: 6,
          width: "min(820px, 95vw)",
          height: "min(580px, 90vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.6rem 1rem",
          borderBottom: "1px solid #1e2732",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#00d4ff", flex: 1 }}>
            Export npm scaffold
          </span>
          <button
            onClick={() => downloadFile(current.path.replace(/\//g, "-"), current.content)}
            style={{
              padding: "0.25rem 0.7rem", fontSize: "0.72rem", fontFamily: "monospace",
              border: "1px solid #1e2732", background: "transparent", color: "#64748b",
              cursor: "pointer", borderRadius: 3,
            }}
          >
            ↓ Download {current.path.split("/").pop()}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#475569",
              fontSize: "1rem", cursor: "pointer", padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        {/* File tabs */}
        <div style={{
          display: "flex", gap: 0,
          borderBottom: "1px solid #1e2732",
          overflowX: "auto", flexShrink: 0,
        }}>
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => setActiveFile(f.path)}
              style={{
                padding: "0.35rem 0.9rem",
                fontSize: "0.72rem", fontFamily: "monospace",
                border: "none",
                borderBottom: `2px solid ${activeFile === f.path ? "#00d4ff" : "transparent"}`,
                background: "transparent",
                color: activeFile === f.path ? "#00d4ff" : "#64748b",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {f.path}
            </button>
          ))}
        </div>

        {/* File content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CodeEditor
            value={current.content}
            language={langMap[current.language] ?? "plaintext"}
            readOnly
            height="100%"
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.4rem 1rem",
          borderTop: "1px solid #1e2732",
          fontSize: "0.68rem", fontFamily: "monospace", color: "#475569",
          flexShrink: 0,
        }}>
          Download each file individually, then run <code style={{ color: "#94a3b8" }}>npm install</code> in the project root.
        </div>
      </div>
    </div>
  );
}
