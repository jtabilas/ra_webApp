import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = join(root, "public");
const dest = join(destDir, "sql-wasm.wasm");

try {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  if (!existsSync(src)) {
    console.warn("[copy-wasm] sql.js not installed yet, skipping");
    process.exit(0);
  }
  copyFileSync(src, dest);
  console.log("[copy-wasm] copied sql-wasm.wasm to /public");
} catch (err) {
  console.warn("[copy-wasm] failed:", err.message);
}
