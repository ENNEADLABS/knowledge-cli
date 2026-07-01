// Heuristique : attend une pipe-table Markdown avec une colonne dont l'en-tete
// contient "route" (insensible a la casse). Limite connue : si le format de
// docs/layout.md change radicalement, ce parseur devra etre ajuste.
export function checkDocDrift({ layoutContent, actualRoutes, layoutFilePath, enabled = true }) {
  if (!enabled) return [];

  const documented = extractDocumentedRoutes(layoutContent);
  const findings = [];

  for (const route of actualRoutes) {
    if (!documented.has(route)) {
      findings.push({
        rule: "doc-drift",
        severity: "warning",
        file: layoutFilePath,
        message: `Route "${route}" presente dans le code mais absente de la table domaine x couche`,
      });
    }
  }

  for (const route of documented) {
    if (!actualRoutes.includes(route)) {
      findings.push({
        rule: "doc-drift",
        severity: "warning",
        file: layoutFilePath,
        message: `Route "${route}" documentee mais introuvable dans le code`,
      });
    }
  }

  return findings;
}

function extractDocumentedRoutes(layoutContent) {
  const { routeColumn, rows } = findTableRows(layoutContent);
  const routes = new Set();
  if (routeColumn === -1) return routes;

  for (const cells of rows) {
    const cell = cells[routeColumn] ?? "";
    for (const match of cell.matchAll(/`([^`]+)`/g)) {
      const slug = normalizeRouteToken(match[1]);
      if (slug) routes.add(slug);
    }
  }

  return routes;
}

// Parse la table domaine x couche : une ligne par domaine, tous les tokens
// entre backticks (toutes colonnes confondues) associes a ce domaine.
// Reutilise par risk-map.mjs pour classer un fichier change par domaine.
export function extractDomainTable(layoutContent) {
  const { rows } = findTableRows(layoutContent);
  return rows.map((cells) => ({
    domain: cells[0] ?? "",
    tokens: cells.flatMap((cell) => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1])),
  }));
}

function findTableRows(layoutContent) {
  const lines = layoutContent.split("\n");

  const headerIndex = lines.findIndex(
    (line) => line.trim().startsWith("|") && splitRow(line).some((cell) => /route/i.test(cell)),
  );
  if (headerIndex === -1) return { routeColumn: -1, rows: [] };

  const routeColumn = splitRow(lines[headerIndex]).findIndex((cell) => /route/i.test(cell));

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) break;
    rows.push(splitRow(line));
  }

  return { routeColumn, rows };
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function normalizeRouteToken(token) {
  const withoutPrefix = token.replace(/^app\/\(app\)\//, "");
  const withoutSlashes = withoutPrefix.replace(/^\/+|\/+$/g, "");
  return withoutSlashes.split("/")[0] || null;
}
