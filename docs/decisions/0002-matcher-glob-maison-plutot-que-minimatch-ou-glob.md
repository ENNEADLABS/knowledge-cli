# 0002 — Matcher glob maison plutot que minimatch ou glob

- **Statut** : Accepte
- **Date** : 2026-07-01
- **Decideurs** : ENNEAD

## Contexte

Plusieurs checks (`fileSize`, `debtMarkers`, `docDrift`) et `risk-map`
matchent des chemins de fichiers contre des patterns glob definis dans
`knowledge.config.json` (`limits[].glob`, `riskRules[].match`, `routesGlob`).
Le besoin reel couvre un sous-ensemble restreint de la syntaxe glob : `*`,
`**`, et une alternance `{a,b,c}` — y compris un wildcard imbrique dans une
accolade (ex. `db/{schema.ts,migrations/**}`).

## Options considerees

- **Dependance `minimatch` ou `glob`** : couverture complete de la syntaxe
  glob, mais une dependance runtime supplementaire pour un outil dont la
  promesse est d'etre copie tel quel d'un repo a l'autre avec un minimum de
  surface d'installation.
- **Matcher maison (`lib/glob.mjs`)** : une fonction unique (`matchGlob`),
  regex-based, qui ne couvre que le sous-ensemble reellement utilise par
  `knowledge.config.json`.

## Decision

Matcher maison, sans dependance externe. `patternToSource` convertit un
pattern en source de regex de facon recursive : chaque option d'un `{a,b,c}`
repasse par la meme fonction, ce qui garantit qu'un wildcard a l'interieur
d'une accolade est interprete comme du glob et non comme du texte litteral.

## Consequences

- Zero dependance glob en dehors de `repomix` (seule dependance runtime du
  CLI).
- Couverture volontairement partielle : pas de negation (`!pattern`), pas de
  `+()`/`?()` de style extglob. Suffisant pour l'usage de
  `knowledge.config.json`, pas un remplacement general de `minimatch`.
- Le portage sur le second projet (ADR-0001) a immediatement fait remonter un
  bug reel : `{a,b/**}` cassait la regex generee (le wildcard imbrique etait
  traite comme un caractere litteral). Corrige en rendant `patternToSource`
  recursif sur les options de `{...}`. Couvert par un test dedie
  (`lib/glob.test.mjs`, cas `src/db/{schema.ts,migrations/**}`).
