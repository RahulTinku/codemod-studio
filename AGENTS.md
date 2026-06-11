# codemod-studio — Agent Instructions

## This is a PUBLIC repository. No Wibey attribution in commits.

## Pre-commit scan
```bash
grep -ri "walmart\|npme\.\|gecgithub\|@gtpjs\|@walmart\|wibey\|wcnp\|r0k067s\|ceecore" \
  . --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```

## Known issue: `package-lock.json`
Gitignored — Walmart network fills it with `npme.walmart.com` URLs.

## Architecture

**The key insight:** only import `jscodeshift/src/core.js`, NEVER the package root.
The root pulls in Node-only Runner/Worker code. core.js is the pure transform API.

**Vite/Next.js polyfills required (in next.config.ts):**
- `path` → `path-browserify`
- `assert` → `assert` (npm package)
- `fs`, `os`, `constants`, `child_process`, `worker_threads` → `false`

**Transform evaluation pattern:**
```typescript
const m = { exports: {} };
new Function('module', 'exports', transformCode)(m, m.exports);
const transform = m.exports.default ?? m.exports;
const result = transform({ source, path: 'file.ts' }, { jscodeshift: core, j: core, ... }, {});
```

**ESM normalisation:** `export default function(...)` → `module.exports = function(...)` 
before passing to `new Function()`. See `src/lib/transform-engine.ts`.

## Stack
- Next.js 15 + TypeScript
- `@monaco-editor/react` 4.7.0 (SSR disabled via dynamic import)
- `jscodeshift/src/core.js` (browser-safe subset)
- `path-browserify` + `assert` (Node polyfills)

## Build verified
- `next build` passes ✅ — 508KB bundle (Monaco + jscodeshift)
- Transform pipeline proven: string source + string transform → transformed output
  via bundled `runTransform()` in `src/lib/transform-engine.ts`
