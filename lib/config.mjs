import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Defauts generiques : un repo sans knowledge.config.json ne doit jamais crasher.
export const DEFAULT_CONFIG = {
  paths: {
    decisionsDir: "docs/decisions",
    blueprintDir: "blueprint",
    layoutFile: "docs/layout.md",
    specsDir: "specs",
  },
  checks: {
    fileSize: { enabled: true, limits: [] },
    debtMarkers: {
      enabled: true,
      filesGlob: "",
      markers: ["TODO", "FIXME", "HACK", ": any", "@ts-ignore"],
    },
    docDrift: { enabled: true, routesGlob: "" },
    adrCoverage: { enabled: true },
  },
  riskRules: [],
  repomix: {
    scan: { exclude: [] },
    agentContext: { exclude: [] },
  },
};

export function loadConfig(rootDir = process.cwd()) {
  const configPath = join(rootDir, "knowledge.config.json");
  if (!existsSync(configPath)) return DEFAULT_CONFIG;
  const userConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  return mergeConfig(DEFAULT_CONFIG, userConfig);
}

export function mergeConfig(defaults, overrides) {
  const result = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] =
      isPlainObject(value) && isPlainObject(defaults[key])
        ? mergeConfig(defaults[key], value)
        : value;
  }
  return result;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
