import { describe, expect, it } from "vitest";
import { checkCounters } from "./counters.mjs";

const ITEMS = [
  {
    name: "routers",
    source: { glob: "api/routers/*.py" },
    citations: [
      { file: "docs/architecture.md", pattern: "(\\d+) routers" },
      { file: "CLAUDE.md", pattern: "(\\d+) routers" },
    ],
  },
];

describe("checkCounters", () => {
  it("ne signale rien quand tous les nombres cites correspondent au compte reel", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "L'API expose 19 routers FastAPI.",
        "CLAUDE.md": "| API | 19 routers |",
      },
    });
    expect(findings).toEqual([]);
  });

  it("signale en erreur chaque doc dont le nombre cite diverge du compte reel", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "L'API expose 17 routers FastAPI.",
        "CLAUDE.md": "| API | 19 routers |",
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "counters",
      severity: "error",
      file: "docs/architecture.md",
    });
    expect(findings[0].message).toContain("17");
    expect(findings[0].message).toContain("19");
    expect(findings[0].message).toContain("routers");
  });

  it("verifie chaque occurrence du pattern, pas seulement la premiere", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "Resume : 19 routers. Detail : 17 routers repartis en modules.",
        "CLAUDE.md": "19 routers",
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("17");
  });

  it("echoue en erreur si la source est vide, sans comparer contre une fausse verite", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 0 },
      docs: {
        "docs/architecture.md": "L'API expose 19 routers FastAPI.",
        "CLAUDE.md": "| API | 19 routers |",
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("api/routers/*.py");
    expect(findings[0].message).toContain("Source vide");
  });

  it("signale en erreur un fichier cite introuvable (contenu null)", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: { "docs/architecture.md": "19 routers", "CLAUDE.md": null },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].file).toBe("CLAUDE.md");
    expect(findings[0].message).toContain("introuvable");
  });

  it("signale en erreur une citation introuvable plutot que de se taire (doc reformulee)", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "L'API expose des routeurs en pagaille.",
        "CLAUDE.md": "19 routers",
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].file).toBe("docs/architecture.md");
    expect(findings[0].message).toContain("Citation introuvable");
  });

  it("signale en erreur un pattern regex invalide", () => {
    const findings = checkCounters({
      items: [
        {
          name: "routers",
          source: { glob: "api/routers/*.py" },
          citations: [{ file: "docs/architecture.md", pattern: "(\\d+ routers" }],
        },
      ],
      counts: { routers: 19 },
      docs: { "docs/architecture.md": "19 routers" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("invalide");
  });

  it("signale en erreur un pattern sans groupe de capture", () => {
    const findings = checkCounters({
      items: [
        {
          name: "routers",
          source: { glob: "api/routers/*.py" },
          citations: [{ file: "docs/architecture.md", pattern: "\\d+ routers" }],
        },
      ],
      counts: { routers: 19 },
      docs: { "docs/architecture.md": "19 routers" },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].message).toContain("groupe de capture");
  });

  it("retourne un tableau vide si enabled est false", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 0 },
      docs: { "docs/architecture.md": "17 routers", "CLAUDE.md": null },
      enabled: false,
    });
    expect(findings).toEqual([]);
  });
});

describe("checkCounters — decouverte des mentions non declarees", () => {
  it("signale en warning une mention du pattern dans un fichier hors citations", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "19 routers",
        "CLAUDE.md": "19 routers",
      },
      discoveryDocs: {
        "docs/getting-started.md": "Le projet compte 17 routers a ce jour.",
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: "counters",
      severity: "warning",
      file: "docs/getting-started.md",
    });
    expect(findings[0].message).toContain("non declaree");
    expect(findings[0].message).toContain("routers");
  });

  it("ne re-signale pas les fichiers deja declares comme citations", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "19 routers",
        "CLAUDE.md": "19 routers",
      },
      discoveryDocs: {
        "docs/architecture.md": "19 routers",
        "docs/getting-started.md": "Rien a voir ici.",
      },
    });
    expect(findings).toEqual([]);
  });

  it("emet un seul warning par (compteur, fichier) meme avec plusieurs occurrences", () => {
    const findings = checkCounters({
      items: ITEMS,
      counts: { routers: 19 },
      docs: {
        "docs/architecture.md": "19 routers",
        "CLAUDE.md": "19 routers",
      },
      discoveryDocs: {
        "docs/getting-started.md": "17 routers au debut, puis 19 routers ensuite.",
      },
    });
    expect(findings).toHaveLength(1);
  });
});
