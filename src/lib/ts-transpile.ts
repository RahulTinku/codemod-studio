/**
 * TypeScript transform support using sucrase.
 *
 * sucrase strips TypeScript syntax (type annotations, interfaces, generics,
 * import type, etc.) without running a full type-checker. It's browser-
 * compatible and purpose-built for this use case.
 *
 * Lazy-loaded on first call to keep the initial bundle small.
 */

type SucraseTransform = (code: string, opts: { transforms: string[] }) => { code: string };
let sucraseTransform: SucraseTransform | null = null;

async function getSucrase(): Promise<SucraseTransform> {
  if (!sucraseTransform) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sucrase = (await import("sucrase")) as any;
    sucraseTransform = sucrase.transform as SucraseTransform;
  }
  return sucraseTransform!;
}

export interface TSTranspileResult {
  ok: true;
  code: string;
}

export interface TSTranspileError {
  ok: false;
  error: string;
}

/**
 * Transpile TypeScript to JavaScript, stripping all type annotations.
 * Returns the JS code ready for eval, or an error if sucrase fails.
 */
export async function transpileTS(
  code: string
): Promise<TSTranspileResult | TSTranspileError> {
  try {
    const transform = await getSucrase();
    const result = transform(code, { transforms: ["typescript"] });
    return { ok: true, code: result.code };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
