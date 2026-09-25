---
title: 'v1.2 — Refonte du jeu de la pince (atelier cartésien)'
type: 'feature'
created: '2026-09-25'
status: 'done'
baseline_commit: 'aa9d7f5e72343e4ee6dda56636d6f9111da8b167'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/briefs/brief-robotic-education-2026-09-25/brief.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le jeu de la pince (atelier 1, robot cartésien) est en 2D, avec une profondeur simulée ; il fait attraper un nounours ; l'objet est déjà aligné avec la pince sur l'axe Y au départ, si bien qu'on n'apprend pas à piloter Y ; et l'app passe à l'étape suivante 1,2 s après la réussite, avec un message trop petit pour qu'on ait le temps de retenir que « 3 axes = robot cartésien » (retours de Cyril, page 3).

**Approach:** Reprendre le jeu avec une représentation en 3D, un objet industriel à attraper, une position de départ qui oblige à piloter les 3 axes (X, Y, Z), et un écran de réussite en grand qui nomme le robot cartésien, avec un bouton « Continuer » à la place de l'avance automatique.

**Décisions :** vraie 3D avec **three.js** ; l'objet à attraper est un **colis en carton**.

## Boundaries & Constraints

**Always:** jouable au doigt sur smartphone (iPhone 13 comme référence), et les commandes restent visibles sans défiler ; les 3 axes X, Y, Z restent affichés et nommés ; le composant garde son contrat (`emit('win')` une seule fois, déclenché désormais par le bouton « Continuer ») ; aucun texte ne parle de « fête », « foraine » ou « peluche » ; « Passer le jeu » continue de fonctionner.

**Never:** modifier les autres jeux, le quiz, les contenus de `content.json` en dehors de ce qui concerne la pince ; ajouter des photos (chantier 4) ; ajouter une dépendance autre que `three`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Départ | le jeu s'ouvre | l'objet est décalé par rapport à la pince sur X ET sur Y (écart minimal franc sur chaque axe) | N/A |
| Prise ratée | on descend (Z) à côté de l'objet | un message indique l'axe à corriger (X ou Y) et la pince remonte | N/A |
| Réussite | l'objet est déposé dans la zone de sortie | grand message « Tu as piloté 3 axes : X, Y, Z. C'est un robot cartésien ! » et bouton « Continuer » ; pas d'avance automatique | N/A |
| Continuer | clic sur « Continuer » | `win` émis une seule fois | double-clic ignoré |
| 3D indisponible | WebGL absent ou en échec | un message propose « Passer le jeu » | pas d'écran blanc |

</frozen-after-approval>

## Code Map

- `frontend/src/components/games/ClawGame.vue` -- **le seul fichier à réécrire.** Aujourd'hui : un canvas 2D avec une fausse profondeur (`depthScale`, `groundAt`) ; un état `claw` {x, y, z, state: idle|down|up|home|done} ; la peluche en `x: 0.7, y: 0.5`, alors que la pince part à `y: 0.5` : c'est la cause de « déjà aligné sur Y » ; la tolérance de prise est `dx < 0.07 && dy < 0.12` ; la réussite fait `setTimeout(() => emit('win'), 1200)`, c'est l'avance automatique à supprimer. Les commandes (croix directionnelle et bouton « Attraper ») fonctionnent en pointer events : à conserver.
- `frontend/src/App.vue` -- monte le jeu par `<component :is="games[block.game]" @win="nextStep" />`, avec le bouton « Passer le jeu » dessous. Ne pas modifier.
- `frontend/package.json` -- ajouter `three`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/components/games/ClawGame.vue` -- réécrire le rendu en three.js : caisse vitrée, portique X/Y, chariot, câble Z et pince ; un colis en carton (texture ou couleur carton, scotch) à attraper ; une trappe de sortie ; des étiquettes d'axes X, Y, Z sur la scène ; une position de départ aléatoire de l'objet avec un écart franc sur X et sur Y ; un message d'aide par axe ; un écran de réussite en grand avec le bouton « Continuer » ; un repli si WebGL échoue.
- [x] `frontend/package.json` -- ajouter la dépendance `three`.
- [x] Vérification -- build, test de fumée sur mobile (compléter `smoke.mjs` : le jeu réellement joué au clavier ou au clic jusqu'à la réussite, puis « Continuer ») ; ne rien commiter ni pousser.

**Acceptance Criteria:**
- Given un iPhone 13, when on arrive sur le jeu, then la scène, les 4 flèches et le bouton « Attraper » sont visibles sans défiler.
- Given 20 ouvertures du jeu, when on relève la position de départ, then l'objet n'est jamais aligné avec la pince sur X ni sur Y.

## Design Notes

L'écart de départ : on tire la position de l'objet jusqu'à obtenir |dx| ≥ 0,25 et |dy| ≥ 0,2 (coordonnées normalisées). En three.js, un seul `WebGLRenderer` est créé, avec un rendu en boucle nettoyé dans `onUnmounted` (`renderer.dispose()`, `cancelAnimationFrame`) et une caméra fixe en 3/4, légèrement plongeante, pour que X, Y et Z se lisent sans ambiguïté.

## Verification

**Commands:**
- `cd frontend && npx vite build` -- attendu : le build réussit
- `node smoke.mjs` dans `/private/tmp/claude-501/-Users-piandrie-work-git-robotic-education/183727a3-c017-445d-96b2-17fe61c9b7f8/scratchpad/` (serveur `npx vite --port 5173` dans `frontend/`) -- attendu : `ERRORS []`, le jeu de la pince est gagné pour de vrai

## Implementation Notes

- `three@^0.186.1` ajouté ; le build passe (avertissement Vite : bundle > 500 kB, dû à three, non bloquant).
- Pince de départ fixe (0,2 ; 0,5), trappe de sortie en (0,1 ; 0,5) ; colis tiré dans x∈[0,35 ; 0,88], y∈[0,22 ; 0,78] jusqu'à |dx| ≥ 0,25 et |dy| ≥ 0,2. Tolérance de prise : 0,06 en X, 0,08 en Y. Vitesses indexées sur le temps (dt), plus sur la cadence d'images.
- Aides ajoutées : anneau-cible au sol sous la pince, compteurs X/Y/Z colorés, message de ratage qui donne l'axe ET le sens ; il s'efface dès que le joueur reprend les commandes.
- Clavier : flèches + Espace/Entrée (utilisé par le test de fumée). Attributs `data-parcel-x/y` et `data-claw-x/y` sur `.claw` pour le test.
- Repli : échec de création du `WebGLRenderer` ou `webglcontextlost` → message « Passer le jeu », commandes grisées.
- Fumée (`smoke.mjs`, iPhone 13, 390×664) : 20 ouvertures sans alignement, visibilité sans défilement, prise ratée, partie gagnée (X au clavier, Y au doigt, Z à Espace), écran de réussite toujours là après 1,5 s, double-clic sur « Continuer » → une seule avance, repli sans WebGL + « Passer le jeu ».

- Orchestrateur : `smoke.mjs` renommé `smoke-claw.mjs` (test de la pince) ; test du parcours complet recréé dans `smoke-path.mjs`. Les deux passent (`ERRORS []`, parcours complet jusqu'au robot final).

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | blind+edge | le colis saute au sol au lâcher | medium | `sync()` l.355-356 : passage de `hubY(claw.z)-0.1-BOX.h/2` à `BOX.h/2 - drop` en une frame | patch |
| 2 | blind+edge+vgap | `onKey` global bloque Espace/Entrée/flèches pour les autres boutons | medium | l.389-399 : `preventDefault()` sans tester `e.target` ; « Passer le jeu » ne répond plus au clavier | patch |
| 3 | blind+edge | `roundRect` absent (Safari < 16) → le jeu bascule en repli | medium | l.139 : appel dans `buildScene()`, exception attrapée → écran de repli | patch |
| 4 | blind | three.js chargé sur l'écran d'accueil pour tous | low | import statique ; chunk principal à 179 Ko gzip, contre ~40 Ko avant ; tout le monde le subit | patch (import dynamique dans le composant) |
| 5 | blind+edge | animation des doigts liée à la fréquence d'affichage | low | l.350 : facteur fixe de 0,25 par frame | patch |
| 6 | blind | le HUD force un rendu Vue à chaque frame | low | l.126 : nouvel objet à chaque frame ; coût sur les tablettes lentes | patch |
| 7 | blind | dialogue de réussite sans focus ni nom accessible | low | le focus reste derrière la surcouche ; correction directe | patch |
| 8 | blind | les commandes clavier ne sont pas annoncées ; flèches à l'écran inactives au clavier | low | fonctionnalité en plus, pas un défaut ; les flèches du clavier fonctionnent | rejeté |
| 9 | blind | `data-parcel-*` révèle la position du colis | low | sans conséquence (le colis est visible à l'écran) | rejeté |
| 10 | blind | style du message lié au libellé (`startsWith('Attrapé')`) | low | aucun défaut visible aujourd'hui ; la correction ajoute un état | rejeté |
| 11 | blind | « Passer le jeu » reste visible sous l'écran de réussite | low | deux boutons mènent au même endroit ; aucun préjudice | rejeté |
| 12 | blind | nombres magiques dans `resize()` | low | pas de défaut constaté ; lisibilité seulement | rejeté |
| 13 | edge | largeur 0 → fov infini | low | le conteneur est toujours visible quand le jeu est monté ; ajout d'une garde | rejeté |
| 14 | edge | `ResizeObserver` absent → exception au montage | low | disponible depuis iOS 13.4 et Chrome 64 ; ajout d'une garde | rejeté |
| 15 | edge | contextes WebGL accumulés si montages répétés | low | un seul montage par parcours ; il faut recharger pour recommencer | rejeté |
| 16 | edge | pas de reprise après `webglcontextrestored` | low | rare ; « Passer le jeu » reste disponible ; ajout d'un gestionnaire | rejeté |
| 17 | vgap | le test de la pince vit hors du dépôt | medium | déjà reporté (harnais de test) dans deferred-work.md | defer (existant) |
| 18 | vgap | le sens du message de ratage n'est pas vérifié | low | le test ne vérifie que « axe X/axe Y » | patch (test) |
| 19 | vgap | la perte de contexte WebGL n'est pas testée | low | seul le chemin « getContext = null » est couvert | patch (test) |
