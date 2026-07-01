import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, loadConfig, mergeConfig } from "./config.mjs";

describe("loadConfig", () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("retourne les defauts generiques quand knowledge.config.json est absent", () => {
    dir = mkdtempSync(join(tmpdir(), "knowledge-config-"));
    expect(loadConfig(dir)).toEqual(DEFAULT_CONFIG);
  });

  it("merge le fichier utilisateur par-dessus les defauts sans les ecraser entierement", () => {
    dir = mkdtempSync(join(tmpdir(), "knowledge-config-"));
    writeFileSync(
      join(dir, "knowledge.config.json"),
      JSON.stringify({
        paths: { decisionsDir: "decisions" },
        checks: { fileSize: { maxLinesOverride: true } },
      }),
    );

    const config = loadConfig(dir);

    expect(config.paths.decisionsDir).toBe("decisions");
    expect(config.paths.blueprintDir).toBe(DEFAULT_CONFIG.paths.blueprintDir);
    expect(config.checks.fileSize.enabled).toBe(true);
    expect(config.checks.fileSize.maxLinesOverride).toBe(true);
  });
});

describe("mergeConfig", () => {
  it("remplace entierement un tableau plutot que de le fusionner", () => {
    const merged = mergeConfig({ riskRules: [{ id: "a" }] }, { riskRules: [{ id: "b" }] });
    expect(merged.riskRules).toEqual([{ id: "b" }]);
  });

  it("ne mute pas l'objet de defauts", () => {
    const defaults = { paths: { decisionsDir: "docs/decisions" } };
    mergeConfig(defaults, { paths: { decisionsDir: "other" } });
    expect(defaults.paths.decisionsDir).toBe("docs/decisions");
  });
});
