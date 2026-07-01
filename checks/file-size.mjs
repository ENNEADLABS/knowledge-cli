import { matchGlob } from "../lib/glob.mjs";

// files: [{ file, lines }], limits: [{ glob, maxLines, tolerance }] (config.checks.fileSize.limits)
export function checkFileSize(files, limits) {
  return files
    .map(({ file, lines }) => ({ file, lines, limit: limitFor(file, limits) }))
    .filter(({ limit, lines }) => limit && lines > limit.maxLines)
    .map(({ file, lines, limit }) => ({
      rule: "file-size",
      severity: lines > limit.maxLines * (1 + limit.tolerance) ? "error" : "warning",
      file,
      message: `${lines} lignes (limite ${limit.maxLines})`,
    }));
}

function limitFor(file, limits) {
  return limits.find(({ glob }) => matchGlob(file, glob));
}
