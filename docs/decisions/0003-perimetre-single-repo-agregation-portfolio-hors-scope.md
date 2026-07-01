# 0003 — Perimetre single-repo, agregation portfolio hors scope

- **Statut** : Accepte
- **Date** : 2026-07-01
- **Decideurs** : ENNEAD

## Contexte

Le besoin reel derriere ce CLI depasse un seul repo : plusieurs entreprises,
plusieurs apps, plusieurs stacks, avec un besoin de relier les apps entre
elles, expliquer la logique business inter-apps, et memoriser les decisions a
l'echelle du portfolio — pas seulement au niveau d'un repo isole.

## Options considerees

- **Etendre ce CLI a une portee multi-repo** : ajouter un `repos.yaml`, une
  agregation inter-apps, une commande `diff-impact` capable de mesurer
  l'impact d'un changement dans un repo sur d'autres apps du portfolio.
- **Garder ce CLI strictement single-repo** : chaque commande opere sur le
  repo courant uniquement, et produit une sortie stable et lisible par un
  outil externe (`.knowledge/signals.json`, `.knowledge/repo-snapshot.xml`).
  Un agregateur portfolio, s'il existe un jour, consomme ces sorties depuis
  N repos plutot que d'etre integre ici.

## Decision

Ce CLI reste strictement single-repo. C'est une consequence directe du
principe pose par l'ADR-0001 : zero code specifique a un repo. Une couche
d'agregation multi-repo (lecture de plusieurs `repos.yaml`, croisement inter-
apps, `diff-impact` portfolio) est par nature specifique a une organisation
donnee et ne doit pas vivre dans un outil pense pour etre copie tel quel d'un
repo a l'autre.

## Consequences

- L'agregation portfolio (multi-entreprises, multi-apps) est **hors perimetre
  de ce repo**, traitee dans un projet separe qui consomme les sorties
  `.knowledge/` produites ici (une par repo) plutot que de les regenerer.
- Ce repo continue de garantir un contrat de sortie stable
  (`validate.mjs` : format de `collectFindings` explicitement fige en
  commentaire) pour permettre a cet agregateur externe de s'y brancher sans
  couplage de code.
- Absence volontaire, pas un manque : un lecteur qui cherche du multi-repo
  dans ce CLI ne le trouvera pas ici par construction, pas par oubli.
