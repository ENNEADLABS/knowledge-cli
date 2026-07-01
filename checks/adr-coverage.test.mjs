import { describe, expect, it } from "vitest";
import { checkAdrCoverage } from "./adr-coverage.mjs";

describe("checkAdrCoverage", () => {
  it("ne signale rien sur une liste d'ADR bien numerotees", () => {
    const findings = checkAdrCoverage(["0001-foo.md", "0002-bar.md", "_template.md", "README.md"]);
    expect(findings).toEqual([]);
  });

  it("signale un doublon de numero", () => {
    const findings = checkAdrCoverage(["0001-foo.md", "0001-bar.md"]);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("0001-foo.md");
  });

  it("signale un fichier sans numero a 4 chiffres", () => {
    const findings = checkAdrCoverage(["notes.md"]);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
  });

  it("retourne un tableau vide sur une liste vide", () => {
    expect(checkAdrCoverage([])).toEqual([]);
  });
});
