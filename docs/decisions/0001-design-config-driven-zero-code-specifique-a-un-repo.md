# 0001 — Design config-driven, zero code specifique a un repo

- **Statut** : Accepte
- **Date** : 2026-07-01
- **Decideurs** : ENNEAD

## Contexte

Ce CLI a ete extrait d'un premier projet (`xais-supercrm`) ou des verifications
de dette de connaissance existaient deja sous forme de scripts bash ad hoc :
seuils de taille de fichier en dur, dossier d'ADR en dur, conventions de route
en dur. Pour reutiliser ces verifications sur un second projet a la stack
completement differente, deux options se presentaient.

## Options considerees

- **Fork par repo** : copier les scripts et adapter les valeurs en dur
  directement dans le code a chaque nouveau repo.
- **Config-driven** : le code ne connait aucune valeur specifique a un repo ;
  tout ce qui varie (chemins, seuils, marqueurs, regles de risque) vit dans un
  fichier `knowledge.config.json` ecrit par chaque projet consommateur.

## Decision

Design config-driven. Le code de `checks/` et `lib/` ne contient aucun chemin,
seuil ou nom de dossier en dur specifique a un repo. Un repo sans
`knowledge.config.json` continue de fonctionner sur des defauts generiques
(`lib/config.mjs`, `DEFAULT_CONFIG`) plutot que de planter.

## Consequences

- Reutiliser ce CLI sur un nouveau repo = copier les fichiers + ecrire un
  `knowledge.config.json` adapte, zero modification de code attendue.
- Chaque check se desactive proprement (`enabled: false` ou absence) au lieu
  de crasher si une convention manque.
- Le portage vers un second projet (stack differente) a fait remonter un vrai
  bug dans le matcher de glob maison — voir ADR-0002 — precisement parce que
  ce second repo utilisait des patterns que le premier n'exercait pas. C'est
  la preuve attendue d'un design config-driven correctement porte : le bug
  etait dans le moteur generique, pas dans une config specifique a un repo.
