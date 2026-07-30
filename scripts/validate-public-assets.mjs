import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(scriptDir, "..", "public");
const reportPath = path.join(publicRoot, "quality_report.html");
const report = await readFile(reportPath, "utf8");

const failures = [];
const forbiddenPatterns = [
  ["/Users path", /\/Users\//u],
  ["/private path", /\/private\//u],
  ["Rerun link", /href=["'][^"']*rerun\//iu],
  ["access token", /(?:art_v1_|hf_)[A-Za-z0-9_-]{20,}/u],
  ["private key", /BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY/u],
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await walk(entryPath)));
    } else {
      paths.push(entryPath);
    }
  }
  return paths;
}

for (const filePath of await walk(publicRoot)) {
  if (!/\.(?:csv|html|json|md|txt)$/iu.test(filePath)) {
    continue;
  }
  const content = await readFile(filePath, "utf8");
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${label}: ${path.relative(publicRoot, filePath)}`);
    }
  }
}

const referencedAssets = new Set(
  [...report.matchAll(/\b(?:href|poster|src)=["']([^"']+)["']/giu)]
    .map((match) => match[1])
    .filter(
      (value) =>
        !value.startsWith("#") &&
        !value.startsWith("data:") &&
        !/^[a-z]+:/iu.test(value),
    )
    .map((value) => decodeURIComponent(value.split(/[?#]/u)[0])),
);

for (const referencedAsset of referencedAssets) {
  try {
    await access(path.join(publicRoot, referencedAsset));
  } catch {
    failures.push(`missing asset: ${referencedAsset}`);
  }
}

const previewsPath = path.join(publicRoot, "previews");
const previewFiles = (await readdir(previewsPath)).filter((name) =>
  name.endsWith(".mp4"),
);
if (previewFiles.length !== 6) {
  failures.push(`expected 6 MP4 previews, found ${previewFiles.length}`);
}
for (const previewFile of previewFiles) {
  const details = await stat(path.join(previewsPath, previewFile));
  if (details.size < 100_000) {
    failures.push(`video is unexpectedly small: ${previewFile}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Public asset validation failed:\n- ${failures.join("\n- ")}`);
}

console.log(
  `Validated ${referencedAssets.size} local references and ${previewFiles.length} MP4 previews.`,
);
