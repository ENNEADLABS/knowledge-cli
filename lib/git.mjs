import { execFileSync } from "node:child_process";

// Union des fichiers changes vs baseRef, du working tree (commits + non commits)
// et des fichiers non suivis. Best-effort : un repo git absent ou une ref
// introuvable renvoie [] plutot que de planter.
export function getChangedFiles(baseRef = "main") {
  const vsBase = gitDiffNames([`${baseRef}...HEAD`]);
  const workingTree = gitDiffNames(["HEAD"]);
  const untracked = gitLsFilesOthers();
  return [...new Set([...vsBase, ...workingTree, ...untracked])];
}

function gitDiffNames(args) {
  try {
    const output = execFileSync("git", ["diff", "--name-only", ...args], { encoding: "utf-8" });
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function gitLsFilesOthers() {
  try {
    const output = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      encoding: "utf-8",
    });
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
