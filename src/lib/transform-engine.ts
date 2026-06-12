/**
 * In-browser jscodeshift transform engine.
 * Runs user-provided transform code strings against source code.
 *
 * IMPORTANT: Only imports jscodeshift/src/core — NOT the package root,
 * which would pull in Node-only Runner/Worker code.
 */

// @ts-expect-error — jscodeshift/src/core has no type declarations
import core from "jscodeshift/src/core.js";

// ── AST types ────────────────────────────────────────────────────────────────

export interface AstNode {
  type: string;
  [key: string]: unknown;
}

export interface AstResult {
  ok: true;
  ast: AstNode;
}

export interface AstError {
  ok: false;
  error: string;
}

/**
 * Serialise a key/value pair from an AST node for display.
 * - Skips loc, start, end, tokens, comments, parent (noise / circular refs)
 * - Truncates long strings
 * - Caps depth to prevent rendering huge trees
 */
const SKIP_KEYS = new Set(["loc", "start", "end", "tokens", "comments", "parent", "extra"]);
const MAX_DEPTH = 12;

function serialiseNode(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 80 ? value.slice(0, 80) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => serialiseNode(item, depth + 1));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k) || typeof v === "function") continue;
      result[k] = serialiseNode(v, depth + 1);
    }
    return result;
  }
  return String(value);
}

/**
 * Parse source and return a serialised AST tree safe for React rendering.
 */
export function parseAST(source: string): AstResult | AstError {
  try {
    const ast = core.withParser("babel")(source).get().node;
    return { ok: true, ast: serialiseNode(ast) as AstNode };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface TransformResult {
  ok: true;
  output: string;
  unchanged: boolean;
}

export interface TransformError {
  ok: false;
  error: string;
  line?: number;
}

/**
 * Run a user-provided codemod transform string against source code.
 *
 * The transform string must follow jscodeshift's API:
 *   module.exports = function(fileInfo, api) {
 *     const j = api.jscodeshift;
 *     return j(fileInfo.source)...toSource();
 *   }
 *
 * ESM export default is also supported (converted automatically).
 */
export function runTransform(
  source: string,
  transformCode: string
): TransformResult | TransformError {
  try {
    // Normalise ESM default export → CommonJS for new Function eval
    const normalised = normaliseToCommonJS(transformCode);
    const m: { exports: Record<string, unknown> } = { exports: {} };
    // eslint-disable-next-line no-new-func
    new Function("module", "exports", normalised)(m, m.exports);
    const transform =
      (m.exports.default as ((f: unknown, a: unknown, o: unknown) => string) | undefined) ??
      (m.exports as unknown as (f: unknown, a: unknown, o: unknown) => string);

    if (typeof transform !== "function") {
      return { ok: false, error: "Transform must export a function" };
    }

    const result = transform(
      { source, path: "file.ts" },
      { jscodeshift: core, j: core, stats() {}, report() {} },
      {}
    );

    const output = result ?? source;
    return { ok: true, output, unchanged: output === source };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lineMatch = msg.match(/\((\d+):\d+\)/);
    return { ok: false, error: msg, line: lineMatch ? parseInt(lineMatch[1]) : undefined };
  }
}

/**
 * Convert ESM default export to CommonJS so it can be eval'd with new Function.
 * Handles: export default function, export default (arrow), module.exports (passthrough).
 */
function normaliseToCommonJS(code: string): string {
  // Already CJS
  if (code.includes("module.exports")) return code;
  // export default function name(...) { ... } → module.exports = function name(...)...
  if (/export\s+default\s+function/.test(code)) {
    return code.replace(/export\s+default\s+function/, "module.exports = function");
  }
  // export default (expr) → module.exports = (expr)
  if (/export\s+default\s+/.test(code)) {
    return code.replace(/export\s+default\s+/, "module.exports = ");
  }
  // Fallback: wrap in module.exports assignment
  return `module.exports = (function() { ${code} })()`;
}
