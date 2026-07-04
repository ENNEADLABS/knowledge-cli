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

  const findings = [];
  const measurable = [];
  const counts = {};
  for (const item of items) {
    const count = countSource(item, findings);
    if (count === null) continue;
    counts[item.name] = count;
    measurable.push(item);
  }

  const docs = {};
  for (const { file } of measurable.flatMap(({ citations }) => citations)) {
    if (!(file in docs)) docs[file] = existsSync(file) ? readFileSync(file, "utf-8") : null;
  }

  const discoveryDocs = discoveryGlob
    ? Object.fromEntries(
        uniqueFiles(globSync(discoveryGlob)).map((file) => [file, readFileSync(file, "utf-8")]),
      )
    : {};

  return [...findings, ...checkCounters({ items: measurable, counts, docs, discoveryDocs })];
}

// source.glob passe par fs.globSync (extglob "!(...)" supporte, verrouille par
// validate.test.mjs) — pas par lib/glob.mjs comme les autres patterns de config.
// containing / notContaining : regex flag "m" (predicats ancres en debut de ligne),
// combinables — un split "25 = 14 + 11" se garde par presence ET par absence du marqueur.
function countSource({ name, source }, findings) {
  const files = uniqueFiles(globSync(source.glob));

  const predicates = [];
  for (const key of ["containing", "notContaining"]) {
    if (!source[key]) continue;
    try {
      predicates.push({ key, regex: new RegExp(source[key], "m") });
    } catch {
      findings.push({
        rule: "counters",
        severity: "error",
        file: source.glob,
        message: `${key} invalide pour le compteur "${name}" : ${source[key]}`,
      });
      return null;
    }
  }
  if (predicates.length === 0) return files.length;

  return files.filter((file) => {
    const content = readFileSync(file, "utf-8");
    return predicates.every(({ key, regex }) =>
      key === "containing" ? regex.test(content) : !regex.test(content),
    );
  }).length;
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
