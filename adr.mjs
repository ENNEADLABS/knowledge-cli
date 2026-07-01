import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function run(args, config) {
  const [subcommand, ...rest] = args;
  if (subcommand !== "new") {
    console.error('Usage: knowledge adr new "<titre>"');
    return 1;
  }

  const title = rest.join(" ").trim();
  if (!title) {
    console.error('Usage: knowledge adr new "<titre>"');
    return 1;
  }

  const decisionsDir = config.paths.decisionsDir;
  mkdirSync(decisionsDir, { recursive: true });

  const number = nextAdrNumber(decisionsDir);
  const slug = slugify(title);
  const filePath = join(decisionsDir, `${number}-${slug}.md`);

  if (existsSync(filePath)) {
    console.error(`Le fichier existe deja : ${filePath}`);
    return 1;
  }

  const templatePath = join(decisionsDir, "_template.md");
  const template = existsSync(templatePath)
    ? readFileSync(templatePath, "utf-8")
    : defaultTemplate();
  const today = new Date().toISOString().slice(0, 10);
  const content = template
    .replace(/^# NNNN — .*/m, `# ${number} — ${title}`)
    .replace(/\*\*Date\*\* : AAAA-MM-JJ/, `**Date** : ${today}`);

  writeFileSync(filePath, content);
  console.log(`ADR creee : ${filePath}`);
  return 0;
}

function nextAdrNumber(decisionsDir) {
  const existing = existsSync(decisionsDir) ? readdirSync(decisionsDir) : [];
  const numbers = existing
    .map((file) => file.match(/^(\d{4})-/))
    .filter(Boolean)
    .map((match) => Number.parseInt(match[1], 10));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(next).padStart(4, "0");
}

function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultTemplate() {
  return [
    "# NNNN — Titre court de la decision",
    "",
    "- **Statut** : Propose | Accepte | Deprecie | Remplace par ADR-XXXX",
    "- **Date** : AAAA-MM-JJ",
    "- **Decideurs** : …",
    "",
    "## Contexte",
    "",
    "## Options considerees",
    "",
    "## Decision",
    "",
    "## Consequences",
    "",
  ].join("\n");
}
