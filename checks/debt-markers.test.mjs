import { describe, expect, it } from "vitest";
import { checkDebtMarkers } from "./debt-markers.mjs";

const MARKERS = ["TODO", "FIXME", "HACK", ": any", "@ts-ignore", "eslint-disable"];

describe("checkDebtMarkers", () => {
  it("ne signale rien sur un fichier propre", () => {
    const findings = checkDebtMarkers(
      [{ file: "a.ts", content: "export const x = 1;\n" }],
      MARKERS,
    );
    expect(findings).toEqual([]);
  });

  it("signale un marqueur avec sa ligne", () => {
    const content = "export const x = 1;\n// TODO: refactor\nexport const y = 2;\n";
    const findings = checkDebtMarkers([{ file: "a.ts", content }], MARKERS);
    expect(findings).toEqual([
      { rule: "debt-markers", severity: "warning", file: "a.ts", message: '"TODO" ligne 2' },
    ]);
  });

  it("signale plusieurs marqueurs distincts sur la meme ligne", () => {
    const content = "const x: any = fetchThing(); // eslint-disable-line\n";
    const findings = checkDebtMarkers([{ file: "a.ts", content }], MARKERS);
    const rules = findings.map((f) => f.message);
    expect(rules).toContain('": any" ligne 1');
    expect(rules).toContain('"eslint-disable" ligne 1');
  });

  it("retourne un tableau vide si markers est vide (portabilite)", () => {
    const findings = checkDebtMarkers([{ file: "a.ts", content: "// TODO\n" }], []);
    expect(findings).toEqual([]);
  });
});
