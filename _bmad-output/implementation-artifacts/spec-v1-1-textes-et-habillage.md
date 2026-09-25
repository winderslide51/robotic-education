---
title: 'v1.1 — Textes et habillage (retours de Cyril)'
type: 'feature'
created: '2026-09-25'
status: 'done'
baseline_commit: '2e6702f0e860abccd12b1b1a3668ca807dee22db'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/briefs/brief-robotic-education-2026-09-25/brief.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le premier testeur (Cyril) juge le ton « fête foraine » peu adapté, la structure floue (la notion d'axe arrive dans le « stand 1/3 »), certaines explications fausses ou maladroites (« glisse sur des rails »), les sources non françaises, et le quiz trop facile ou peu lisible (chrono petit, bonne réponse peu visible, réponses de la mission finale toujours dans le même ordre).

**Approach:** Réhabiller l'app en « halle » industrielle avec des « ateliers », ajouter un écran d'introduction « C'est quoi un axe ? » avant l'atelier 1, réécrire les textes signalés, passer à des vidéos de sources françaises et rendre le quiz plus lisible et moins prévisible. On ne touche ni aux mécaniques des jeux ni aux visuels, qui relèvent des chantiers suivants.

**Décisions :** l'app s'appelle **Robolution** ; le lieu est la **halle technique** (« Bienvenue dans la halle technique »), et chaque robot y a son **atelier**.

## Boundaries & Constraints

**Always:** le parcours reste jouable de bout en bout sur mobile, sans compte ; le contenu reste dans `backend/app/content.json` (servi par l'API Python, avec le repli embarqué côté front) ; tous les textes sont en français, sans jargon ; la version se livre avec le tag `v1.1.0` poussé sur GitHub.

**Never:** modifier la mécanique des jeux (`ClawGame.vue`, `SortGame.vue`, `PourGame.vue`), sauf le mot « peluche » s'il apparaît hors du jeu ; ajouter des photos ou des illustrations (chantier 4) ; modifier l'humanoïde final (chantier 5) ; changer l'infrastructure Amplify.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Temps écoulé au quiz | le chrono atteint 0 | un bandeau bien visible affiche « Temps écoulé ! La bonne réponse était : X », et la bonne réponse est mise en évidence | N/A |
| Mission finale | on ouvre chaque mission | les 3 robots s'affichent dans un ordre mélangé, jamais dans le même ordre qu'à la mission précédente | N/A |
| API indisponible | l'appel à `/content` échoue | le contenu embarqué est utilisé et affiche les mêmes nouveaux textes | le repli existant dans `api.js` |

</frozen-after-approval>

## Code Map

- `frontend/src/App.vue` -- enchaînement des phases (`intro`, `block`, `review`, `scenarios`, `end`) ; libellés à changer : logo l.73, titre de l'accueil l.81, `.stands` l.83, « Stand n / 3 » l.90, bouton « Jouer » l.95 ; les boutons des missions l.131-139 parcourent `content.blocks` dans l'ordre fixe.
- `frontend/src/components/QuizStep.vue` -- chrono de 15 s par défaut ; retour sur la réponse avec la classe `.good` (contour) ; texte « Temps écoulé ! » ; le bloc `.top` affiche le chrono en petit.
- `backend/app/content.json` -- tous les textes : `question`, `answer`, `piece.name`/`desc`, `quiz[]`, `video{}`, `scenarios[]`. Une seule source de vérité, réutilisée par le front.
- `frontend/src/style.css` -- classes `.stands` et `.stand`, à renommer.
- `frontend/index.html`, `backend/app/handler.py` -- le nom « RoboFête » (dans `<title>` et dans la docstring).
- Vidéos vérifiées (oEmbed 200, intégrables ; début et fin estimés). Format : `id` (repli) — source.
  - Cartésien : `DkysL-me4KU` (repli `455M0sEfTRE`, ECI Concept, intégrateur français, palettiseur cartésien) — Sepro Robotique, fabricant français de robots cartésiens (La Roche-sur-Yon). Extrait de 0 à 30 s.
  - SCARA : `OFImCYTZzfU` (repli `-ysQYp1YsFY`, Process Alimentaire) — Stäubli, fabricant français (Faverges), tri de pêches. Extrait de 40 à 70 s.
  - 6 axes : `YXSK4Cnm_ps` (repli `2z0vl0k8vZ0`, Stäubli) — Guignard Robotisation, intégrateur français, robot barman qui sert à boire. Extrait de 5 à 40 s.
- Ne pas modifier : `api.js`, `amplify/`, `amplify.yml`, les jeux.

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/content.json` -- ajouter `intro` {titre, texte, explication des 3 familles}, qui répond à « C'est quoi un axe ? » ; réécrire les `question` et `answer` de chaque atelier ; cartésien : « se déplace le long de ses 3 axes, en ligne droite » (et non « glisse sur des rails ») ; quiz « Où trouve-t-on… ? » → « Par exemple, où trouve-t-on… ? » ; retirer « pince de fête foraine » ; réécrire les pièces (« Axe linéaire », « Ventouse », « Poignet 3 axes (axes 4-5-6) ») avec des descriptions justes et simples ; remplacer les vidéos par des sources françaises (Sepro, Stäubli…) avec des libellés de source à jour, et choisir pour le 6 axes une vidéo où l'on voit clairement ce que fait le robot.
- [x] `frontend/src/App.vue` -- remplacer le nom de l'app et « fête foraine » par « Robolution » et « halle technique » ; « Stand » → « Atelier » ; ajouter une phase `bases` (l'écran « C'est quoi un axe ? ») entre `intro` et le premier atelier ; « Jouer » → « Tester » ; mélanger l'ordre des robots à chaque mission, avec un ordre différent de la mission précédente.
- [x] `frontend/src/components/QuizStep.vue` -- chrono passé à 20 s, affiché en grand ; quand le temps est écoulé ou la réponse fausse, afficher un bandeau bien visible « La bonne réponse : X » ; bonne réponse en fond vert plein, les autres atténuées.
- [x] `frontend/src/style.css`, `frontend/index.html`, `backend/app/handler.py` -- renommer (classes, `<title>`, docstring).
- [x] Livraison -- build et test de fumée sur mobile ; ne rien commiter ni pousser (le commit, le push sur `main` et le tag `v1.1.0` sont faits par l'orchestrateur après la revue).

**Acceptance Criteria:**
- Given l'écran d'accueil, when on le lit, then aucun texte ne mentionne « fête », « foraine » ou « stand » (sauf éventuellement le jeu de la pince, reporté au chantier 3).
- Given l'accueil validé, when on continue, then un écran « C'est quoi un axe ? » apparaît avant « Atelier 1 / 3 ».
- Given le dépôt GitHub, when la version est livrée, then le tag `v1.1.0` existe et pointe sur le commit déployé.

## Design Notes

Le mélange des missions : on garde l'ordre précédent en mémoire et on remélange tant que le nouvel ordre est identique (avec 3 éléments, 6 permutations possibles, donc la boucle s'arrête vite). La phase `bases` réutilise le style `.naive` existant, avec 3 petites cartes (cartésien, SCARA, 6 axes) sous forme de texte ; les images arriveront au chantier 4.

## Verification

**Commands:**
- `cd frontend && npx vite build` -- attendu : le build réussit
- `node smoke.mjs` dans `/private/tmp/claude-501/-Users-piandrie-work-git-robotic-education/183727a3-c017-445d-96b2-17fe61c9b7f8/scratchpad/` (Playwright y est installé ; remettre l'URL sur `http://localhost:5173/`, lancer `npx vite --port 5173` dans `frontend/`, et adapter les clics au nouveau parcours) -- attendu : `ERRORS []`, le parcours se termine
- `git grep -niE "f[êe]te|foraine|RoboFête" -- frontend/src backend frontend/index.html` -- attendu : seules des occurrences dans `ClawGame.vue`, ou aucune

## Implementation Notes

- Agent d'implémentation : `content.json` (ajout de `intro`, textes, pièces et vidéos françaises), `App.vue` (phase `bases`, Robolution et halle technique, Atelier, Tester, robots mélangés), `QuizStep.vue` (chrono de 20 s en grand, bandeau vert, bonne réponse en fond vert plein), plus les renommages dans `style.css`, `index.html` et `handler.py`.
- Corrections de l'orchestrateur après lecture du diff : texte « La bonne réponse était : X » quand le temps est écoulé (pour coller à la matrice) ; accroche « Teste le robot… » ; **propositions du quiz mélangées** (la bonne réponse était presque toujours la 1re, ce qui rendait le quiz trop facile, cf. l'intention) ; **ordre des missions mélangé** (leurs réponses suivaient l'ordre des ateliers).
- Vérification : `vite build` OK ; test de fumée sur iPhone 13 (le repli embarqué est utilisé en local, ce qui couvre la ligne « API indisponible ») : 8 vérifications sur 8, `ERRORS []`.

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | edge | `content.intro` absent (ancien `/content` en cache 300 s) → TypeError sur l'écran `bases` | low | `App.vue` lit `content.intro.title` sans garde ; l'en-tête `Cache-Control: max-age=300` rend le cas possible juste après un déploiement | patch |
| 2 | blind | idem n°1 (même cause) | low | groupé avec n°1 | patch |
| 3 | edge | `answer` hors de `choices` → `indexOf` = -1 = temps écoulé | false | toutes les réponses de `content.json` sont des indices valides (0 à 2) ; cas inaccessible | rejeté |
| 4 | edge | le mélange des missions peut rendre l'ordre des ateliers (1 chance sur 6) | low | réel, mais l'ordre reste imprévisible, ce qui est l'objectif ; la correction ajoute une garde | rejeté |
| 5 | edge | la 1re mission peut afficher Cartésien, SCARA, 6 axes | low | même raisonnement que n°4 | rejeté |
| 6 | vgap | le remappage de `answer` après mélange n'est pas testé | medium | pas de harnais de test dans le dépôt (pré-vérifié) | defer |
| 7 | vgap | le mélange des missions et des robots n'est pas testé | medium | idem | defer |
| 8 | vgap | le contrat `intro` n'est pas vérifié | medium | idem | defer |
| 9 | vgap | `QuizStep` n'est pas réactif aux changements de `questions` | false | chaque usage recrée l'instance (`:key`, section séparée) ; cas inaccessible | rejeté |
| 10 | blind | le titre et la source ne suivent pas la vidéo de repli | medium | les `fallbackId` viennent d'autres chaînes ; le défaut existait déjà en v1.0 | defer |
| 11 | blind | le mélange est écrit 3 fois | low | `App.vue` (x2) et `QuizStep.vue` : un correctif n'irait pas partout | patch |
| 12 | blind | les réponses numériques mélangées (« 3, 1, 2 ») | low | visible à chaque partie (question 1 du cartésien) | patch |
| 13 | blind | bandeau d'erreur vert = couleur du succès | medium | `.banner` en `#1e8449`, comme `.good` ; « Temps écoulé ! » se lit comme une réussite | patch |
| 14 | blind | le retour du quiz n'est pas annoncé aux lecteurs d'écran | low | pas d'`aria-live` ; correction directe | patch |
| 15 | blind | la vidéo cartésien (pièces) ne colle pas au quiz et à la mission (palettisation) | low | la vidéo de repli ECI Concept (palettiseur, français) colle mieux ; échange direct | patch |
| 16 | blind | la phrase du SCARA est répétée entre l'intro et l'atelier | low | le texte est identique ; réécriture directe | patch |
| 17 | blind | « Poignet 3 axes (axes 4-5-6) » est du jargon et un libellé long | low | nom choisi dans la spec et présenté à l'utilisateur avant approbation | rejeté |
| 18 | blind | « la pince du jeu » suppose d'avoir joué | low | le jeu peut être passé ; reformulation directe | patch |
| 19 | blind | les noms de robots sont à 3 endroits, et les ids `intro` ne sont pas vérifiés | low | risque de divergence des ids ; relève du harnais de test | defer (groupé avec 6 à 8) |
| 20 | blind | aucun test pour les nouveaux comportements | medium | idem 6 à 8 | defer (groupé) |
| 21 | blind | l'en-tête affiche « 0 · 0/3 » sur l'écran `bases` ; docstring incomplète | low | condition `phase !== 'intro'` ; correction directe | patch |
