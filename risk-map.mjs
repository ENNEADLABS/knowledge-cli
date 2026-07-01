import { existsSync, readFileSync } from "node:fs";
import { extractDomainTable } from "./checks/doc-drift.mjs";
import { matchGlob } from "./lib/glob.mjs";
import { getChangedFiles } from "./lib/git.mjs";

export async function run(args, config) {
  if (!args.includes("--diff")) {
    console.error("Usage: knowledge risk-map --diff");
    return 1;
  }

  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("Aucun fichier change.");
    return 0;
  }

  const { layoutFile } = config.paths;
  const domainTable = existsSync(layoutFile)
    ? extractDomainTable(readFileSync(layoutFile, "utf-8"))
    : [];

  for (const file of files) {
    const domain = classifyDomain(file, domainTable);
    const risks = config.riskRules.filter((rule) => matchGlob(file, rule.match));

    const risksLabel =
      risks.length > 0 ? risks.map((r) => `${r.severity}:${r.label}`).join(", ") : "-";
    console.log(`${file}\n  domaine: ${domain}\n  risques: ${risksLabel}`);
  }

  return 0;
}

export function classifyDomain(file, domainTable) {
  let best = null;

  for (const { domain, tokens } of domainTable) {
    for (const token of tokens) {
      const needle = token.replace(/^\/+|\/+$/g, "");
      if (needle && file.includes(needle) && (!best || needle.length > best.needleLength)) {
        best = { domain, needleLength: needle.length };
      }
    }
  }

  return best?.domain ?? "non classe";
}
