/**
 * Lovable preview expects a `dist/` folder after build.
 * Cross-platform replacement for Unix-only shell in package.json scripts.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const dist = "dist";
mkdirSync(dist, { recursive: true });

if (existsSync("public")) {
  cpSync("public", dist, { recursive: true });
}

writeFileSync(
  join(dist, "index.html"),
  '<!doctype html><meta http-equiv="refresh" content="0;url=/">'
);
