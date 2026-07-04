// items: config.checks.counters.items — [{ name, source: { glob }, citations: [{ file, pattern }] }]
// counts: { [name]: compte reel cote code (glob resolu en amont par validate.mjs) }
// docs: { [file]: contenu du fichier cite, ou null s'il n'existe pas }
// discoveryDocs: { [file]: contenu } — fichiers balayes pour detecter les mentions non declarees
//
// Sevérites : tout ce qui est deterministe est "error" (drift, citation ou fichier
// introuvable, source vide, pattern casse) — un compteur faux ne doit pas pouvoir se
// normaliser dans une baseline de findings. Seule la decouverte (heuristique, faux
// positifs possibles) reste "warning".
export function checkCounters({ items, counts, docs, discoveryDocs = {}, enabled = true }) {
  if (!enabled) return [];

  const findings = [];
  for (const item of items) {
    const count = counts[item.name];

    // Precondition cote verite : une source vide (repertoire demenage, glob perime)
    // invalide la mesure — on ne compare jamais contre une fausse verite.
    if (count === 0) {
      const filters = ["containing", "notContaining"]
        .filter((key) => item.source[key])
        .map((key) => `${key} "${item.source[key]}"`)
        .join(" et ");
      const sourceLabel = filters
        ? `glob "${item.source.glob}" avec ${filters}`
        : `glob "${item.source.glob}"`;
      findings.push(
        finding(
          "error",
          item.source.glob,
          `Source vide pour le compteur "${item.name}" (${sourceLabel} ne matche aucun fichier) — citations non comparees`,
        ),
      );
      continue;
    }

    for (const { file, pattern } of item.citations) {
      findings.push(...checkCitation({ name: item.name, count, file, pattern, content: docs[file] }));
    }

    findings.push(...discoverUndeclared(item, discoveryDocs));
  }
  return findings;
}

function checkCitation({ name, count, file, pattern, content }) {
  if (content == null) {
    return [finding("error", file, `Fichier cite introuvable (compteur "${name}")`)];
  }

  const regex = compile(pattern);
  if (!regex) {
    return [finding("error", file, `Pattern invalide pour le compteur "${name}" : ${pattern}`)];
  }

  const matches = [...content.matchAll(regex)];
  if (matches.length === 0) {
    // Une doc reformulee ne doit pas rendre le check silencieux : signaler.
    return [
      finding("error", file, `Citation introuvable pour le compteur "${name}" (pattern : ${pattern})`),
    ];
  }

  if (matches[0][1] === undefined) {
    return [
      finding("error", file, `Pattern sans groupe de capture pour le compteur "${name}" : ${pattern}`),
    ];
  }

  // Comparaison numerique voulue, pas textuelle : une citation zero-paddee
  // ("008", chaines de migrations) doit matcher le compte 8. Fige par un test.
  return matches
    .filter((match) => Number(match[1]) !== count)
    .map((match) => finding("error", file, `Cite ${match[1]} ${name}, le code en compte ${count}`));
}

// Balaye discoveryDocs avec les patterns du compteur : une mention dans un fichier
// non declare en citation = un site de drift potentiel que personne ne surveille.
function discoverUndeclared(item, discoveryDocs) {
  const declared = new Set(item.citations.map(({ file }) => file));
  const patterns = [...new Set(item.citations.map(({ pattern }) => pattern))];

  const findings = [];
  for (const [file, content] of Object.entries(discoveryDocs)) {
    if (declared.has(file) || content == null) continue;

    const mentioned = patterns.some((pattern) => {
      const regex = compile(pattern);
      return regex && regex.test(content);
    });
    if (mentioned) {
      findings.push(
        finding(
          "warning",
          file,
          `Mention non declaree du compteur "${item.name}" — ajouter le fichier aux citations ou reformuler`,
        ),
      );
    }
  }
  return findings;
}

function compile(pattern) {
  try {
    return new RegExp(pattern, "g");
  } catch {
    return null;
  }
}

function finding(severity, file, message) {
  return { rule: "counters", severity, file, message };
}
