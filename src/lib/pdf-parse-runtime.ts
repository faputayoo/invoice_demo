let cachedPdfParse: typeof import("pdf-parse") | null = null;

export async function loadPdfParse(): Promise<typeof import("pdf-parse")> {
  if (cachedPdfParse) {
    return cachedPdfParse;
  }

  const { createRequire } = await import("node:module");
  const require = createRequire(`${process.cwd()}/package.json`);

  // Force the CommonJS entry because pdf-parse's CJS build wires up Node canvas
  // globals that can be missing when the standalone deploy loads the ESM entry.
  cachedPdfParse = require("pdf-parse") as typeof import("pdf-parse");
  return cachedPdfParse;
}