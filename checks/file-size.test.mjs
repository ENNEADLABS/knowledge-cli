import { describe, expect, it } from "vitest";
import { checkFileSize } from "./file-size.mjs";

const LIMITS = [
  { glob: "src/lib/services/**/*.ts", maxLines: 200, tolerance: 0.2 },
  { glob: "src/components/**/*.tsx", maxLines: 150, tolerance: 0.2 },
];

describe("checkFileSize", () => {
  it("ignore les fichiers sous la limite", () => {
    const findings = checkFileSize([{ file: "src/lib/services/tagService.ts", lines: 50 }], LIMITS);
    expect(findings).toEqual([]);
  });

  it("signale en warning entre la limite et la tolerance", () => {
    const findings = checkFileSize(
      [{ file: "src/lib/services/tagService.ts", lines: 220 }],
      LIMITS,
    );
    expect(findings).toEqual([
      {
        rule: "file-size",
        severity: "warning",
        file: "src/lib/services/tagService.ts",
        message: "220 lignes (limite 200)",
      },
    ]);
  });

  it("signale en error au-dela de la tolerance", () => {
    const findings = checkFileSize(
      [{ file: "src/lib/services/tagService.ts", lines: 300 }],
      LIMITS,
    );
    expect(findings[0].severity).toBe("error");
  });

  it("ignore un fichier qui ne matche aucune limite configuree", () => {
    const findings = checkFileSize([{ file: "src/app/page.tsx", lines: 9999 }], LIMITS);
    expect(findings).toEqual([]);
  });

  it("retourne un tableau vide si limits est vide (portabilite)", () => {
    const findings = checkFileSize([{ file: "src/lib/services/tagService.ts", lines: 9999 }], []);
    expect(findings).toEqual([]);
  });
});
