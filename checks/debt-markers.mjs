// files: [{ file, content }], markers: string[] (config.checks.debtMarkers.markers)
export function checkDebtMarkers(files, markers) {
  const findings = [];
  for (const { file, content } of files) {
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const marker of markers) {
        if (line.includes(marker)) {
          findings.push({
            rule: "debt-markers",
            severity: "warning",
            file,
            message: `"${marker}" ligne ${index + 1}`,
          });
        }
      }
    });
  }
  return findings;
}
