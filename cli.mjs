#!/usr/bin/env node
import { loadConfig } from "./lib/config.mjs";

const COMMANDS = {
  scan: "./scan.mjs",
  update: "./update.mjs",
  validate: "./validate.mjs",
  "agent-context": "./agent-context.mjs",
  "risk-map": "./risk-map.mjs",
  adr: "./adr.mjs",
  onboarding: "./onboarding.mjs",
};

function printHelp() {
  console.log("Usage: knowledge <commande> [options]\n");
  console.log("Commandes :");
  for (const name of Object.keys(COMMANDS)) {
    console.log(`  ${name}`);
  }
}

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command) {
    printHelp();
    return 0;
  }

  const modulePath = COMMANDS[command];
  if (!modulePath) {
    console.error(`Commande inconnue : ${command}\n`);
    printHelp();
    return 1;
  }

  // Pas de try/catch : toutes les commandes de COMMANDS existent. Une erreur
  // d'import est un vrai bug de module et doit sortir avec sa stack, pas etre
  // maquillee en "commande pas implementee".
  const mod = await import(modulePath);

  const config = loadConfig(process.cwd());
  const exitCode = await mod.run(rest, config);
  return exitCode ?? 0;
}

const exitCode = await main(process.argv.slice(2));
process.exitCode = exitCode;
