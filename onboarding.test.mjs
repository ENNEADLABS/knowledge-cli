import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "./onboarding.mjs";

// run() lit et ecrit relativement au cwd : on l'exerce dans un repo temporaire reel
// (pas de mock fs), cwd restaure apres chaque test.
describe("onboarding run", () => {
  let previousCwd;
  let repoDir;

  beforeEach(() => {
    previousCwd = process.cwd();
    repoDir = mkdtempSync(join(tmpdir(), "knowledge-onboarding-"));
    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(repoDir, { recursive: true, force: true });
  });

  function configWith(paths) {
    return { paths: { decisionsDir: "docs/decisions", ...paths } };
  }

  it("n'emet qu'une fois layoutFile quand il vit dans blueprintDir", async () => {
    mkdirSync("docs", { recursive: true });
    writeFileSync("docs/architecture.md", "# Archi\n\nContenu unique du layout.");
    writeFileSync("docs/status.md", "# Status\n\nEtat courant.");

    const code = await run([], configWith({ blueprintDir: "docs", layoutFile: "docs/architecture.md" }));

    expect(code).toBe(0);
    const output = readFileSync(".knowledge/onboarding.md", "utf-8");
    expect(output.match(/Contenu unique du layout\./g)).toHaveLength(1);
    expect(output).toContain("## Carte du repo");
    expect(output).not.toContain("## Blueprint — architecture.md");
    expect(output).toContain("## Blueprint — status.md");
  });

  it("garde tous les blueprints quand layoutFile est hors de blueprintDir", async () => {
    mkdirSync("docs", { recursive: true });
    mkdirSync("blueprint", { recursive: true });
    writeFileSync("docs/layout.md", "# Layout");
    writeFileSync("blueprint/architecture.md", "# Archi");

    const code = await run([], configWith({ blueprintDir: "blueprint", layoutFile: "docs/layout.md" }));

    expect(code).toBe(0);
    const output = readFileSync(".knowledge/onboarding.md", "utf-8");
    expect(output).toContain("## Carte du repo");
    expect(output).toContain("## Blueprint — architecture.md");
  });

  it("date la sortie avec un timestamp ISO en tete", async () => {
    const code = await run([], configWith({ blueprintDir: "blueprint", layoutFile: "docs/layout.md" }));

    expect(code).toBe(0);
    const output = readFileSync(".knowledge/onboarding.md", "utf-8");
    expect(output).toMatch(/^# Onboarding\n\nGenere le \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });
});
