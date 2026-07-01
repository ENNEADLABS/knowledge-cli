// fileNames: noms de fichiers de config.paths.decisionsDir (readdirSync fait en amont)
export function checkAdrCoverage(fileNames) {
  const findings = [];
  const seen = new Map();

  for (const fileName of fileNames) {
    if (fileName === "_template.md" || fileName === "README.md") continue;

    const match = fileName.match(/^(\d{4})-/);
    if (!match) {
      findings.push({
        rule: "adr-coverage",
        severity: "warning",
        file: fileName,
        message: "Nom de fichier ADR sans numero a 4 chiffres en prefixe",
      });
      continue;
    }

    const number = match[1];
    if (seen.has(number)) {
      findings.push({
        rule: "adr-coverage",
        severity: "error",
        file: fileName,
        message: `Numero ADR ${number} en doublon avec ${seen.get(number)}`,
      });
    } else {
      seen.set(number, fileName);
    }
  }

  return findings;
}
