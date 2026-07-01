// Matcher glob maison : couvre uniquement le sous-ensemble utilise par
// knowledge.config.json (**, *, {a,b,c}). Pas de dependance minimatch/glob.
export function matchGlob(path, pattern) {
  return new RegExp(`^${patternToSource(pattern)}$`).test(path);
}

// Convertit un pattern (ou un fragment, ex. une option de {a,b,c}) en source
// de regex. Recursif : chaque option de {a,b,c} repasse par cette meme
// fonction, donc un wildcard a l'interieur d'une accolade (ex. "{x,y/**}")
// est bien interprete comme glob, pas comme texte litteral.
function patternToSource(pattern) {
  let source = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];

    if (char === "*") {
      if (pattern[i + 1] === "*") {
        i += 1;
        // "**/" doit aussi matcher une absence de segment (ex: "**/*.ts" == "*.ts").
        if (pattern[i + 1] === "/") {
          i += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "{") {
      const end = pattern.indexOf("}", i);
      const options = pattern.slice(i + 1, end).split(",");
      source += `(?:${options.map(patternToSource).join("|")})`;
      i = end;
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  return source;
}

function escapeRegExp(text) {
  return text.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}
