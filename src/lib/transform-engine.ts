/**
 * In-browser jscodeshift transform engine.
 * Runs user-provided transform code strings against source code.
 *
 * IMPORTANT: Only imports jscodeshift/src/core — NOT the package root,
 * which would pull in Node-only Runner/Worker code.
 */

// @ts-expect-error — jscodeshift/src/core has no type declarations
import core from "jscodeshift/src/core.js";

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
