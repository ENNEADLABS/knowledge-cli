import { existsSync, globSync, readFileSync, readdirSync, statSync } from "node:fs";
import { checkAdrCoverage } from "./checks/adr-coverage.mjs";
import { checkCounters } from "./checks/counters.mjs";
import { checkDebtMarkers } from "./checks/debt-markers.mjs";
import { checkDocDrift } from "./checks/doc-drift.mjs";
import { checkFileSize } from "./checks/file-size.mjs";
import { formatJson, formatText } from "./lib/format.mjs";

// Format fige : { checks: Finding[], violations: Finding[] }.
// Toute evolution doit rester retro-compatible pour repo-audit.md (cf. tache
// de refactor qui consomme cette sortie) et pour scan.mjs qui reutilise
// collectFindings() directement.
export function collectFindings(config) {
  const findings = [
    ...(config.checks.fileSize.enabled ? runFileSize(config) : []),
    ...(config.checks.debtMarkers.enabled ? runDebtMarkers(config) : []),
    ...(config.checks.docDrift.enabled ? runDocDrift(config) : []),
    ...(config.checks.adrCoverage.enabled ? runAdrCoverage(config) : []),
    ...(config.checks.counters.enabled ? runCounters(config) : []),
  ];

  const violations = findings.filter((finding) => finding.severity === "error");
  return { checks: findings, violations };
}

export async function run(args, config) {
  const result = collectFindings(config);
  console.log(args.includes("--json") ? formatJson(result) : formatText(result));
  return result.violations.length > 0 ? 1 : 0;
}

function runFileSize(config) {
  const { limits } = config.checks.fileSize;
  const files = uniqueFiles(limits.flatMap(({ glob }) => globSync(glob)));
  const withLines = files.map((file) => ({ file, lines: countLines(file) }));
  return checkFileSize(withLines, limits);
}

function runDebtMarkers(config) {
  const { filesGlob, markers } = config.checks.debtMarkers;
  if (!filesGlob) return [];
  const files = uniqueFiles(globSync(filesGlob));
  const withContent = files.map((file) => ({ file, content: readFileSync(file, "utf-8") }));
  return checkDebtMarkers(withContent, markers);
}

function runDocDrift(config) {
  const { routesGlob, enabled } = config.checks.docDrift;
  const { layoutFile } = config.paths;
  if (!existsSync(layoutFile)) return [];

  const layoutContent = readFileSync(layoutFile, "utf-8");
  const actualRoutes = routesGlob
    ? globSync(routesGlob)
        .filter((entry) => statSync(entry).isDirectory())
        .map((entry) => entry.split("/").pop())
    : [];

  return checkDocDrift({ layoutContent, actualRoutes, layoutFilePath: layoutFile, enabled });
}

function runAdrCoverage(config) {
  const { decisionsDir } = config.paths;
  const fileNames = existsSync(decisionsDir) ? readdirSync(decisionsDir) : [];
  return checkAdrCoverage(fileNames);
}

function runCounters(config) {
  const { items, discoveryGlob } = config.checks.counters;
  if (items.length === 0) return [];

  const counts = Object.fromEntries(
    items.map(({ name, source }) => [name, uniqueFiles(globSync(source.glob)).length]),
  );

  const docs = {};
  for (const { file } of items.flatMap(({ citations }) => citations)) {
    if (!(file in docs)) docs[file] = existsSync(file) ? readFileSync(file, "utf-8") : null;
  }

  const discoveryDocs = discoveryGlob
    ? Object.fromEntries(
        uniqueFiles(globSync(discoveryGlob)).map((file) => [file, readFileSync(file, "utf-8")]),
      )
    : {};

  return checkCounters({ items, counts, docs, discoveryDocs });
}

function uniqueFiles(paths) {
  return [...new Set(paths)].filter((path) => statSync(path).isFile());
}

function countLines(file) {
  // Compte les "\n" (convention wc -l) plutot que les segments de split, pour
  // rester coherent avec les nombres deja rapportes par /repo-audit.
  const content = readFileSync(file, "utf-8");
  return (content.match(/\n/g) ?? []).length;
}
