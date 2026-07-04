import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export async function run(args, config) {
  const { blueprintDir, layoutFile, decisionsDir } = config.paths;
  const sections = [
    `# Onboarding\n\nGenere le ${new Date().toISOString()} — snapshot derive du repo, a regenerer avant usage.`,
  ];

  if (existsSync(layoutFile)) {
    sections.push(`## Carte du repo\n\n${readFileSync(layoutFile, "utf-8").trim()}`);
  }

  if (existsSync(blueprintDir)) {
    // layoutFile peut vivre dans blueprintDir : deja emis en "Carte du repo", ne pas le dupliquer.
    const layoutPath = resolve(layoutFile);
    for (const file of markdownFiles(blueprintDir)) {
      if (resolve(blueprintDir, file) === layoutPath) continue;
      sections.push(
        `## Blueprint — ${file}\n\n${readFileSync(join(blueprintDir, file), "utf-8").trim()}`,
      );
    }
  }

  if (existsSync(decisionsDir)) {
    const list = markdownFiles(decisionsDir)
      .filter((file) => /^\d{4}-/.test(file))
      .map((file) => `- ${adrTitle(join(decisionsDir, file)) ?? file}`)
      .join("\n");
    sections.push(`## Decisions d'architecture (ADR)\n\n${list}`);
  }

  mkdirSync(".knowledge", { recursive: true });
  const outputPath = ".knowledge/onboarding.md";
  writeFileSync(outputPath, sections.join("\n\n---\n\n"));

  console.log(`Onboarding genere : ${outputPath}`);
  return 0;
}

function markdownFiles(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort();
}

function adrTitle(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return content.match(/^#\s*(.+)$/m)?.[1];
}
