# knowledge

[![test](https://github.com/ENNEADLABS/knowledge-cli/actions/workflows/test.yml/badge.svg)](https://github.com/ENNEADLABS/knowledge-cli/actions/workflows/test.yml)

Un CLI pour maintenir la couche de connaissance d'un repo — pas le code, la
connaissance *sur* le code : les décisions d'architecture, la cartographie du
projet, les zones à risque, la synchro entre la doc et la réalité.

Le code a des linters et des formatters depuis toujours. La documentation
n'a rien d'équivalent, alors qu'elle se périme exactement de la même façon.

## Pourquoi

Un projet accumule deux dettes : une dette de code (`eslint`/`prettier`/`tsc`
la surveillent) et une dette de connaissance — pourquoi telle décision a été
prise, quels fichiers sont sensibles à toucher, si la doc raconte encore la
vérité du code. Personne ne surveille la seconde, en général.

`knowledge` formalise ces vérifications en sept commandes, pensées pour être
copiées telles quelles d'un repo à l'autre.

## Design : config-driven, pas de code spécifique à un repo

Le code de ce CLI ne connaît **rien** de spécifique au projet où il tourne :
pas de seuil de lignes en dur, pas de convention de dossier en dur, pas de
règle métier en dur. Tout ce qui varie d'un repo à l'autre vit dans un seul
fichier, `knowledge.config.json`, écrit par chaque projet.

Réutiliser ce CLI sur un nouveau repo = copier ces fichiers, écrire un
`knowledge.config.json` adapté, zéro modification de code attendue.

## Installation

```bash
# Cloner ou copier ce repo dans un dossier scripts/knowledge/ de ton projet
git clone https://github.com/ENNEADLABS/knowledge-cli scripts/knowledge

# Dépendances (repomix uniquement — le reste est stdlib Node)
cd scripts/knowledge && npm install
```

Ajoute un script à ton `package.json` :

```json
{
  "scripts": {
    "knowledge": "node scripts/knowledge/cli.mjs"
  }
}
```

Le `package.json` de ce repo déclare un champ `bin` (`knowledge`), mais ce
paquet n'est pas publié sur un registre npm : la seule installation
supportée est le git-clone ci-dessus, pas `npm i -g knowledge-cli` ni
`npx knowledge-cli`.

Puis écris ton `knowledge.config.json` à la racine de ton projet — voir
`knowledge.config.example.json` pour un exemple commenté ci-dessous, et la
section Configuration.

## Commandes

| Commande | Rôle |
|---|---|
| `knowledge validate [--json]` | La doc et le code sont-ils encore synchronisés ? Taille de fichiers, marqueurs de dette (TODO/`any`/...), drift routes vs doc, intégrité ADR. Exit code ≠ 0 si une erreur est trouvée. |
| `knowledge scan` | Snapshot complet du repo via [Repomix](https://repomix.com), + signaux de `validate`, écrits dans `.knowledge/` (gitignoré). |
| `knowledge agent-context [--stdout]` | Snapshot allégé (exclut tests, dossiers volumineux) pour donner le contexte du repo à un agent IA. |
| `knowledge adr new "<titre>"` | Crée une fiche de décision d'architecture, numérotée automatiquement, format [MADR](https://adr.github.io/madr/). |
| `knowledge risk-map --diff` | Classe les fichiers changés (git diff) par domaine et par règle de risque configurée. |
| `knowledge update` | Rapport de drift doc/code en lecture seule — n'écrit jamais rien. |
| `knowledge onboarding` | Assemble la doc d'architecture, la vision produit et la liste des ADR en un seul fichier lisible. |

## Configuration (`knowledge.config.json`)

Chaque check se désactive proprement (`enabled: false` ou simple absence)
plutôt que de planter si un chemin ou une convention manque. Un repo sans
config du tout continue de fonctionner sur des défauts génériques (voir
`DEFAULT_CONFIG` dans `lib/config.mjs`). Le bloc ci-dessous montre la forme
attendue du fichier, avec des valeurs d'exemple — pas les défauts intégrés,
qui diffèrent volontairement (ex. `blueprintDir` vaut `"blueprint"` par
défaut).

```jsonc
{
  "paths": {
    "decisionsDir": "docs/decisions", // dossier des ADR
    "blueprintDir": "docs",           // doc de vision/archi assemblee par onboarding
    "layoutFile": "docs/layout.md",   // carte du repo (table domaine x couche)
    "specsDir": "specs"
  },
  "checks": {
    "fileSize": { "enabled": true, "limits": [ /* { glob, maxLines, tolerance } */ ] },
    "debtMarkers": { "enabled": true, "filesGlob": "src/**/*.ts", "markers": ["TODO", "@ts-ignore"] },
    "docDrift": { "enabled": true, "routesGlob": "src/routes/*" },
    "adrCoverage": { "enabled": true }
  },
  "riskRules": [
    // { id, label, match (glob), severity: "warning" | "error" }
  ],
  "repomix": {
    "scan": { "exclude": ["vendor/**"] },
    "agentContext": { "exclude": ["vendor/**", "tests/**"] }
  }
}
```

Voir `knowledge.config.example.json` pour un exemple complet.

Le matching de glob (`limits[].glob`, `riskRules[].match`, `routesGlob`) est
fait par un petit matcher maison (`lib/glob.mjs`, pas de dépendance
`minimatch`/`glob`) qui couvre `**`, `*` et `{a,b,c}` — y compris un wildcard
imbriqué dans une accolade (`db/{schema.ts,migrations/**}`).

`checks/doc-drift.mjs` est une heuristique : elle attend une pipe-table
Markdown avec une colonne dont l'en-tête contient "route" (insensible à la
casse). Si ton repo n'a pas ce genre de doc, laisse `docDrift.enabled: false`.

## Tests

```bash
npm test
```

Les fonctions de `checks/` et `lib/` sont pures et testées en isolation
(fixtures en mémoire, pas de lecture disque). `cli.mjs`, `scan.mjs`,
`adr.mjs`, `onboarding.mjs` sont de la glue non testée unitairement —
vérifiées manuellement via leur usage réel.

## Genèse

Construit initialement pour formaliser des vérifications qui existaient déjà
en bash ad hoc dans un projet (ADR manuels, carte de repo tenue à la main).
Porté ensuite sur un second projet à la stack complètement différente pour
prouver le design config-driven — ce portage a immédiatement fait remonter
un vrai bug dans le matcher de glob (`{a,b/**}` cassait la regex), corrigé
depuis.

Les décisions structurantes de ce repo (design config-driven, matcher glob
maison, périmètre single-repo) sont elles-mêmes tracées dans
[`docs/decisions/`](docs/decisions/), générées avec `knowledge adr new` — cet
outil s'applique à lui-même.

Inspiré de [Repomix](https://repomix.com) (empaqueter un repo pour une IA) et
du format [MADR](https://adr.github.io/madr/) pour les ADR.

## Roadmap

- [ ] Agrégateur portfolio (multi-repo, multi-app) — hors périmètre de ce
      repo par design (voir [ADR-0003](docs/decisions/0003-perimetre-single-repo-agregation-portfolio-hors-scope.md)),
      traité dans un projet séparé consommant les sorties `.knowledge/` de
      plusieurs repos.
- [x] CI GitHub Actions (`npm test` sur push/PR).
- [ ] Publication npm si le chemin `npx knowledge-cli` doit devenir réel
      (voir note dans la section Installation).

## License

MIT
