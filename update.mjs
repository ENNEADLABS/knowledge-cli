import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import { checkDocDrift } from "./checks/doc-drift.mjs";

// Rapport en lecture seule : n'ecrit jamais docs/layout.md.
export async function run(args, config) {
  const { routesGlob, enabled } = config.checks.docDrift;
  const { layoutFile } = config.paths;

  if (!enabled) {
    console.log("Check doc-drift desactive (config.checks.docDrift.enabled = false).");
    return 0;
  }

  if (!existsSync(layoutFile)) {
    console.log(`Fichier introuvable : ${layoutFile} (rien a comparer).`);
    return 0;
  }

  const layoutContent = readFileSync(layoutFile, "utf-8");
  const actualRoutes = routesGlob
    ? globSync(routesGlob)
        .filter((entry) => statSync(entry).isDirectory())
        .map((entry) => entry.split("/").pop())
    : [];

  const findings = checkDocDrift({
    layoutContent,
    actualRoutes,
    layoutFilePath: layoutFile,
    enabled,
  });

  if (findings.length === 0) {
    console.log(`Aucun drift detecte entre ${layoutFile} et les routes reelles.`);
    return 0;
  }

  for (const finding of findings) {
    console.log(`[!] ${finding.message}`);
  }
  console.log(`\n${findings.length} ecart(s) documente(s) vs code.`);
  return 0;
}
