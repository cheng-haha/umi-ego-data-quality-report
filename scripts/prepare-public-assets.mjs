import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.resolve(siteRoot, "..", "umidata_quality");
const publicRoot = path.join(siteRoot, "public");

const files = [
  "events.csv",
  "metrics.csv",
  "quality_report.json",
  "RESULTS.md",
  "visualization_manifest.json",
];
const directories = ["previews", "projection_diagnostics", "snapshots"];

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });

for (const file of files) {
  await cp(path.join(sourceRoot, file), path.join(publicRoot, file));
}
for (const directory of directories) {
  await cp(path.join(sourceRoot, directory), path.join(publicRoot, directory), {
    recursive: true,
  });
}

const sourceHtml = await readFile(
  path.join(sourceRoot, "quality_report.html"),
  "utf8",
);
const publicHtml = sourceHtml.replace(
  /<a class='btn btn--light' href='rerun\/[^']+'>Rerun 3D<\/a>/g,
  "",
);
await writeFile(path.join(publicRoot, "quality_report.html"), publicHtml);

const resultsPath = path.join(publicRoot, "RESULTS.md");
const results = await readFile(resultsPath, "utf8");
await writeFile(
  resultsPath,
  results.replace(
    /，或用 Rerun 打开\s*\n?`rerun\/\*\.rrd`。/u,
    "。",
  ),
);

function redactLocalPaths(value) {
  if (Array.isArray(value)) {
    return value.map(redactLocalPaths);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactLocalPaths(item),
      ]),
    );
  }
  if (
    typeof value === "string" &&
    (value.startsWith("/Users/") || value.startsWith("/private/"))
  ) {
    return "[local path omitted]";
  }
  return value;
}

function redactLocalPathsInText(value) {
  return value.replace(
    /\/(?:Users|private)\/[^\s"',<>&)\]}]*/gu,
    "[local path omitted]",
  );
}

async function sanitizeJsonTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await sanitizeJsonTree(entryPath);
    } else if (entry.name.endsWith(".json")) {
      const parsed = JSON.parse(await readFile(entryPath, "utf8"));
      await writeFile(
        entryPath,
        `${JSON.stringify(redactLocalPaths(parsed), null, 2)}\n`,
      );
    }
  }
}

async function sanitizeTextTree(directory) {
  const textExtensions = new Set([".csv", ".html", ".md", ".txt"]);
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await sanitizeTextTree(entryPath);
    } else if (textExtensions.has(path.extname(entry.name))) {
      const value = await readFile(entryPath, "utf8");
      await writeFile(entryPath, redactLocalPathsInText(value));
    }
  }
}

await sanitizeJsonTree(publicRoot);
await sanitizeTextTree(publicRoot);
