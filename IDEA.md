# codemod-studio
> Write, test, preview, and share jscodeshift codemods — live in the browser.

**Status:** ✅ Pushed — github.com/RahulTinku/codemod-studio | Live: codemod-studio.vercel.app
**Priority:** P1

## Shipped
- Three-pane editor: Source | Transform | Output (Monaco Editor)
- jscodeshift/src/core.js bundled for browser (path-browserify + assert polyfills)
- 4 built-in examples (rename, arrow→function, remove console.log, require→import)
- Shareable URL — encode state in URL hash, copy link button
- Auto-run on edit (400ms debounce)

## Pending (after 04–06 are built)
- AST explorer panel
- Test runner (before/after pairs)
- Export as npm package scaffold

See root README.md for full spec.
