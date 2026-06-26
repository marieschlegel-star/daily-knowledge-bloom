/**
 * Lovable publish serves static files from `dist/`.
 * Copy Next.js static export (`out/`) instead of a redirect stub.
 */
import { cpSync, existsSync, rmSync } from "fs";

const outDir = "out";
const distDir = "dist";

if (!existsSync(outDir)) {
  console.error("lovable-postbuild: missing out/ — run next build with output: 'export' first");
  process.exit(1);
}

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

cpSync(outDir, distDir, { recursive: true });
console.log("lovable-postbuild: copied out/ → dist/");
