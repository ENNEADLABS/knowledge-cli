import { mkdirSync } from "node:fs";
import { runRepomix } from "./lib/repomix.mjs";

export async function run(args, config) {
  const useStdout = args.includes("--stdout");
  const outputPath = ".knowledge/agent-context.md";

  let repomixArgs;
  if (useStdout) {
    repomixArgs = ["--style", "markdown", "--stdout"];
  } else {
    mkdirSync(".knowledge", { recursive: true });
    repomixArgs = ["--style", "markdown", "-o", outputPath];
  }
  repomixArgs.push(
    "--header-text",
    `Genere par knowledge-cli le ${new Date().toISOString()} — snapshot a regenerer avant usage.`,
  );
  if (config.repomix.agentContext.exclude.length > 0) {
    repomixArgs.push("-i", config.repomix.agentContext.exclude.join(","));
  }

  try {
    runRepomix(repomixArgs);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  if (!useStdout) console.log(`Contexte agent : ${outputPath}`);
  return 0;
}
