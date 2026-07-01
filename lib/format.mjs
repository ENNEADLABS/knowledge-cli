export function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

export function formatText(result) {
  const lines = result.checks.map((finding) => {
    const marker = finding.severity === "error" ? "x" : "!";
    return `[${marker}] [${finding.rule}] ${finding.file}: ${finding.message}`;
  });

  if (lines.length === 0) lines.push("Aucun probleme detecte.");

  lines.push("");
  lines.push(`${result.checks.length} finding(s), ${result.violations.length} erreur(s).`);
  return lines.join("\n");
}
