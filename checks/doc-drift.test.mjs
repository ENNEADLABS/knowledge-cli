import { describe, expect, it } from "vitest";
import { checkDocDrift, extractDomainTable } from "./doc-drift.mjs";

const LAYOUT_FIXTURE = `
## 2. Matrice domaine x couche

| Domaine     | Page route                 | Composants              |
| ----------- | --------------------------- | ------------------------ |
| Contacts    | \`app/(app)/contacts/\`      | \`components/contacts/\` |
| Deals       | \`app/(app)/deals/\`, \`/pipeline/\` | \`components/deals/\`    |
| Recherche   | (palette globale)          | \`components/search/\`   |

## 3. Suite
`;

describe("checkDocDrift", () => {
  it("ne signale rien quand code et doc sont alignes", () => {
    const findings = checkDocDrift({
      layoutContent: LAYOUT_FIXTURE,
      actualRoutes: ["contacts", "deals", "pipeline"],
      layoutFilePath: "docs/layout.md",
    });
    expect(findings).toEqual([]);
  });

  it("signale une route reelle absente de la table", () => {
    const findings = checkDocDrift({
      layoutContent: LAYOUT_FIXTURE,
      actualRoutes: ["contacts", "deals", "pipeline", "invoices"],
      layoutFilePath: "docs/layout.md",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"invoices"');
  });

  it("signale une entree de table sans route correspondante", () => {
    const findings = checkDocDrift({
      layoutContent: LAYOUT_FIXTURE,
      actualRoutes: ["contacts"],
      layoutFilePath: "docs/layout.md",
    });
    const messages = findings.map((f) => f.message);
    expect(messages.some((m) => m.includes('"deals"'))).toBe(true);
    expect(messages.some((m) => m.includes('"pipeline"'))).toBe(true);
  });

  it("ignore proprement une ligne sans backticks (pas de route dediee)", () => {
    const findings = checkDocDrift({
      layoutContent: LAYOUT_FIXTURE,
      actualRoutes: ["contacts", "deals", "pipeline"],
      layoutFilePath: "docs/layout.md",
    });
    expect(findings.some((f) => f.message.includes("Recherche"))).toBe(false);
  });

  it("retourne un tableau vide si enabled est false", () => {
    const findings = checkDocDrift({
      layoutContent: LAYOUT_FIXTURE,
      actualRoutes: ["invoices"],
      layoutFilePath: "docs/layout.md",
      enabled: false,
    });
    expect(findings).toEqual([]);
  });
});

describe("extractDomainTable", () => {
  it("associe chaque domaine a tous ses tokens entre backticks, toutes colonnes confondues", () => {
    const table = extractDomainTable(LAYOUT_FIXTURE);
    expect(table).toEqual([
      { domain: "Contacts", tokens: ["app/(app)/contacts/", "components/contacts/"] },
      { domain: "Deals", tokens: ["app/(app)/deals/", "/pipeline/", "components/deals/"] },
      { domain: "Recherche", tokens: ["components/search/"] },
    ]);
  });

  it("retourne un tableau vide si aucune table n'est trouvee", () => {
    expect(extractDomainTable("Pas de table ici.")).toEqual([]);
  });
});
