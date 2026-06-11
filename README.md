# codemod-studio

> Write, test and preview jscodeshift codemods live in the browser.

**[Live demo →](https://codemod-studio.vercel.app)**

---

## What it is

A browser-based IDE for [jscodeshift](https://github.com/facebook/jscodeshift) codemods. Paste your source code, write a transform, see the output instantly — no install, no Node.js, no terminal.

```
┌─────────────┬─────────────────┬─────────────┐
│   Source    │    Transform    │   Output    │
│  (your TS)  │  (jscodeshift)  │  (result)   │
└─────────────┴─────────────────┴─────────────┘
                  ↑ auto-runs on edit (400ms)
```

## Why

Every platform team doing large-scale migrations writes jscodeshift codemods. The DX for writing and testing them is terrible — `node codemod.js ./src --dry` in a terminal, staring at a diff, iterate. This gives you a live feedback loop.

AST Explorer exists but it's built around AST traversal, not writing real transforms. This is built for writing real jscodeshift codemods you can actually run on a codebase.

## Built-in examples

| Example | What it does |
|---------|-------------|
| Rename variable | Replace all `oldName` identifiers with `newName` |
| Arrow → function | Convert arrow function variables to named declarations |
| Remove console.log | Strip all `console.log()` calls |
| require → import | Convert CJS `require()` to ESM `import` |

## Writing a transform

The editor accepts standard jscodeshift transform format:

```js
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.Identifier, { name: 'oldName' })
    .replaceWith(() => j.identifier('newName'))
    .toSource();
};
```

ESM `export default function(...)` is also supported.

## How it works

jscodeshift normally runs in Node.js. Running it in a browser requires:

1. Import only `jscodeshift/src/core.js` — not the package root (which pulls in Node-only `child_process`/`worker_threads` code)
2. Polyfill `path` → `path-browserify`, `assert` → `assert`
3. Stub out `fs`, `os`, `constants` → `false`
4. Evaluate the user's transform string via `new Function('module', 'exports', code)`

See `next.config.ts` for the webpack polyfill config and `src/lib/transform-engine.ts` for the eval harness.

## Stack

- **Next.js 15** (App Router, static export)
- **@monaco-editor/react** — VS Code editor in the browser
- **jscodeshift** — running fully client-side via webpack polyfills
- **TypeScript**

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # type-check without building
```

## Deploy

One-click deploy to Vercel (no environment variables needed — fully static):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/RahulTinku/codemod-studio)

## Roadmap

- [ ] AST explorer panel (visual tree view)
- [x] Shareable URL — encode source + transform in URL hash, copy with ⬡ share button
- [ ] Test runner (define before/after pairs, run all)
- [ ] Export as npm package scaffold
- [ ] TypeScript support in transforms (babel-register equivalent)

## License

MIT
