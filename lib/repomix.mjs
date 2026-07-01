import { execFileSync } from "node:child_process";

export function runRepomix(args) {
  try {
    execFileSync("npx", ["repomix", ...args], { stdio: "inherit" });
  } catch (error) {
    throw new Error(
      `repomix a echoue (verifie qu'il est installe : "npx repomix --version") : ${error.message}`,
    );
  }
}
