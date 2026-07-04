import { mkdirSync, writeFileSync } from "node:fs";
import { runRepomix } from "./lib/repomix.mjs";
import { collectFindings } from "./validate.mjs";

export async function run(args, config) {
  mkdirSync(".knowledge", { recursive: true });

  const generatedAt = new Date().toISOString();
  const snapshotPath = ".knowledge/repo-snapshot.xml";
  const repomixArgs = [
    "-o",
    snapshotPath,
    "--header-text",
    `Genere par knowledge-cli le ${generatedAt} — snapshot a regenerer avant usage.`,
  ];
  if (config.repomix.scan.exclude.length > 0) {
    repomixArgs.push("-i", config.repomix.scan.exclude.join(","));
  }

  try {
    runRepomix(repomixArgs);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  const result = collectFindings(config);
  const signalsPath = ".knowledge/signals.json";
  writeFileSync(
    signalsPath,
    JSON.stringify(
      { generatedAt, snapshotPath, validate: result },
      null,
      2,
    ),
  );

  console.log(`Snapshot repomix : ${snapshotPath}`);
  console.log(`Signaux : ${signalsPath} (${result.checks.length} finding(s))`);
  return 0;
}
