import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resout le repomix vendore a cote de CE fichier (node_modules du CLI), jamais
// via npx : npx resout depuis le cwd du repo audite, et retomberait sur le
// registre (version non pinnee, lenteur, prompt) des que le CLI est vendore
// dans un autre repo. Chemin du bin en dur : "repomix/package.json" n'est pas
// exporte par le paquet, et la version est pinnee par le lockfile du CLI.
const REPOMIX_BIN = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "repomix",
  "bin",
  "repomix.cjs",
);

export function runRepomix(args) {
  if (!existsSync(REPOMIX_BIN)) {
    throw new Error(
      `repomix introuvable (${REPOMIX_BIN}) : lance "npm install" dans le dossier du CLI knowledge.`,
    );
  }
  try {
    execFileSync(process.execPath, [REPOMIX_BIN, ...args], { stdio: "inherit" });
  } catch (error) {
    throw new Error(`repomix a echoue : ${error.message}`);
  }
}
