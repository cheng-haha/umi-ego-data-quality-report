import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(siteRoot, "public");
const distRoot = path.join(siteRoot, "dist");

await rm(distRoot, { recursive: true, force: true });
await cp(publicRoot, distRoot, { recursive: true });

console.log("Built static report in dist/.");
