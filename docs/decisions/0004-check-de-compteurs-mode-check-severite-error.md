# 0004 — Check de compteurs : mode check, severite error, fail-fast sur source vide

- **Statut** : Accepte
- **Date** : 2026-07-04
- **Decideurs** : ENNEAD

## Contexte

Le deploiement de l'outil sur un repo reel a montre le mode de defaillance
principal d'une doc maintenue a la main : les nombres qui mentent. Trois
compteurs (« 23 presets », « 17 routers », « 14 pages ») avaient drifte
(reel : 25, 19, 17), chaque chiffre vivait en 3 a 7 endroits (README,
architecture.md, CLAUDE.md, getting-started), et aucun check existant ne
pouvait l'attraper — `docDrift` ne compare que des tokens de routes dans la
table de `layout.md`.

## Options considerees

- **Mode generation** : l'outil reecrit les nombres dans les docs sources
  (`knowledge update --counters`). Drift impossible, mais l'outil se met a
  muter des docs sources — contraire au contrat « derives jetables dans
  `.knowledge/`, le CLI n'ecrit jamais dans les sources ».
- **Mode check** : les docs restent ecrites a la main, la config declare pour
  chaque compteur une verite cote code (`source.glob`) et une liste de sites
  de citation (`citations[]` : fichier + regex a groupe de capture). Le check
  compare et signale.

## Decision

Mode check (`checks/counters.mjs`), avec trois choix de semantique :

1. **Deterministe = error, pas warning.** Divergence, citation introuvable
   (doc reformulee), fichier cite manquant, pattern casse : tout est `error`.
   Un drift de compteur est deterministe et coute 30 secondes a corriger ;
   en `warning` il se normaliserait dans une baseline de findings — c'est
   precisement le mecanisme par lequel la doc du repo pilote est restee
   fausse un mois.
2. **Fail-fast cote verite.** La regex de citation n'est pas la seule moitie
   fragile : le glob source peut pourrir en silence (routes demenagees dans
   un sous-package → 0 ou un sous-ensemble). Une source qui matche 0 fichier
   est une mesure invalide : `error` et aucune comparaison — jamais de
   comparaison contre une fausse verite.
3. **Decouverte des sites non declares.** Un compteur verifie ses N citations
   declarees ; les mentions ailleurs re-driftent. `discoveryGlob` balaye un
   ensemble de docs avec les patterns du compteur et signale en `warning`
   (heuristique, faux positifs possibles) toute mention dans un fichier hors
   `citations[]`.

## Consequences

- Perimetre assume : faits enumerables uniquement (des fichiers qu'un glob
  sait compter). Les claims qualitatives restent hors de portee — on ne tente
  pas de les verifier mecaniquement.
- Le compte suffit : « 23 ≠ 25 » mene un humain droit aux lignes manquantes ;
  pas de verification d'appartenance ensembliste.
- Un `--fix` opt-in (mode generation cible) reste possible plus tard si
  corriger a la main s'avere penible ; il devra rester opt-in pour preserver
  le contrat « le CLI n'ecrit jamais dans les sources ».
- `validate` sort desormais en exit code ≠ 0 des qu'un compteur ment — le
  futur gate CI en herite sans travail supplementaire.

## Amendements — 2026-07-04, retour du premier consommateur (distiller)

- **Extglob assume et fige.** `source.glob` et `discoveryGlob` passent par
  `fs.globSync` de Node (pas `lib/glob.mjs`) ; la negation `!(...)` est le
  seul mecanisme d'exclusion et des configs consommatrices en dependent.
  Documente au README, verrouille par `validate.test.mjs`.
- **`source.containing` accepte.** Predicat de contenu (regex, flag `m`) qui
  filtre les fichiers du glob avant comptage — necessaire pour les splits du
  type « 25 presets = 14 document + 11 routable » (compter les YAML contenant
  `^routing:`). Deterministe, pas d'execution : compatible avec le contrat.
- **`source.command` rejete.** Une verite calculee par commande arbitraire
  (`pytest --co` pour un compte de tests) exigerait d'executer du shell
  declare dans `knowledge.config.json` : une config est une donnee, et
  `validate` doit rester sur a lancer sur un repo fraichement clone. Ces
  verites passent par un artefact genere par la CI (badge, fichier compte)
  que le compteur peut ensuite citer — pas par le CLI.
- **Comparaison numerique voulue.** `Number("008") === 8` : une citation
  zero-paddee (head alembic) matche le compte entier. Ce n'est pas une
  coincidence mais un contrat, fige par un test pour survivre a un refactor
  vers une comparaison textuelle.
