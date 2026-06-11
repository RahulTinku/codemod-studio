"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  label?: string;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
  readOnly = false,
  label,
  height = "100%",
}: CodeEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height }}>
      {label && (
        <div style={{
          padding: "0.4rem 0.8rem",
          fontSize: "0.72rem",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#64748b",
          background: "#0d1117",
          borderBottom: "1px solid #1e2732",
        }}>
          {label}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            lineNumbers: "on",
            renderLineHighlight: readOnly ? "none" : "line",
            contextmenu: false,
          }}
        />
      </div>
    </div>
  );
}
