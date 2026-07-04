import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "./lib/config.mjs";
import { collectFindings } from "./validate.mjs";

// Integration sur filesystem reel (tmpdir + chdir) : verrouille notamment le
// support extglob "!(...)" de fs.globSync, dont des configs consommatrices
// dependent comme seul mecanisme d'exclusion. Une regression Node ici ferait
// tomber les compteurs en "Source vide" — ce test la rend visible avant.
describe("collectFindings — counters sur fs reel", () => {
  let previousCwd;
  let repoDir;

  beforeEach(() => {
    previousCwd = process.cwd();
    repoDir = mkdtempSync(join(tmpdir(), "knowledge-validate-"));
    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(repoDir, { recursive: true, force: true });
  });

  function countersConfig(items) {
    return mergeConfig(DEFAULT_CONFIG, { checks: { counters: { enabled: true, items } } });
  }

  it("compte via une negation extglob !(...) dans source.glob", () => {
    mkdirSync("api/routers", { recursive: true });
    for (const file of ["__init__.py", "users.py", "billing.py"]) {
      writeFileSync(join("api/routers", file), "");
    }
    mkdirSync("docs", { recursive: true });
    writeFileSync("docs/architecture.md", "L'API expose 2 routers.");

    const config = countersConfig([
      {
        name: "routers",
        source: { glob: "api/routers/!(__init__).py" },
        citations: [{ file: "docs/architecture.md", pattern: "(\\d+) routers" }],
      },
    ]);

    expect(collectFindings(config).checks).toEqual([]);

    writeFileSync("docs/architecture.md", "L'API expose 3 routers.");
    const { checks } = collectFindings(config);
    expect(checks).toHaveLength(1);
    expect(checks[0].severity).toBe("error");
    expect(checks[0].message).toContain("Cite 3 routers, le code en compte 2");
  });

  it("compte via source.containing les fichiers dont le contenu matche", () => {
    mkdirSync("presets", { recursive: true });
    writeFileSync("presets/a.yaml", "name: a\nrouting:\n  target: x\n");
    writeFileSync("presets/b.yaml", "name: b\nrouting:\n  target: y\n");
    writeFileSync("presets/c.yaml", "name: c\n");
    mkdirSync("docs", { recursive: true });
    writeFileSync("docs/architecture.md", "25 presets dont 2 presets routables.");

    const config = countersConfig([
      {
        name: "presets-routables",
        source: { glob: "presets/*.yaml", containing: "^routing:" },
        citations: [{ file: "docs/architecture.md", pattern: "(\\d+) presets routables" }],
      },
    ]);

    expect(collectFindings(config).checks).toEqual([]);
  });

  it("signale en erreur un containing invalide sans crasher ni comparer", () => {
    mkdirSync("presets", { recursive: true });
    writeFileSync("presets/a.yaml", "routing: x\n");
    mkdirSync("docs", { recursive: true });
    writeFileSync("docs/architecture.md", "1 presets routables");

    const config = countersConfig([
      {
        name: "presets-routables",
        source: { glob: "presets/*.yaml", containing: "([" },
        citations: [{ file: "docs/architecture.md", pattern: "(\\d+) presets routables" }],
      },
    ]);

    const { checks } = collectFindings(config);
    expect(checks).toHaveLength(1);
    expect(checks[0].severity).toBe("error");
    expect(checks[0].message).toContain("containing invalide");
  });
});
