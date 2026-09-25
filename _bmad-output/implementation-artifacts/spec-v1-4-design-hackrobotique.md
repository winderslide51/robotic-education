---
title: 'v1.4 — Design HackRobotique (charte Figma)'
type: 'feature'
created: '2026-09-25'
status: 'in-review'
baseline_commit: 'e4e51769c156de34a9fc91adbb39d57d5c019714'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/design-figma/charte-hackrobotique.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'app a un habillage provisoire (fond crème, cartes arrondies, couleurs pastel héritées de la « fête foraine ») qui ne correspond pas au design réalisé dans Figma pour le projet (fichier HackRobotique).

**Approach:** Réhabiller toute l'interface selon la charte Figma : fond blanc, accent orange `#EA580C`, police Geist, angles droits, badge d'étape, cartes de réponse avec pastilles de lettre, encadré d'explication, carte vidéo, barre de progression fine, et un accueil avec l'illustration isométrique et le bouton « Commencer → » à mosaïque. Les textes, le parcours et la logique des jeux ne changent pas.

## Boundaries & Constraints

**Always:** les valeurs viennent de `charte-hackrobotique.md` et sont centralisées en variables CSS dans `style.css` (aucune couleur en dur ailleurs, sauf dans les scènes 3D) ; mobile d'abord (402 px de large comme dans Figma, iPhone 13 comme référence) ; le contraste des textes reste lisible (AA) ; tous les tests existants passent.

**Never:** modifier le contenu, l'enchaînement du parcours ou la logique des jeux ; ajouter un framework CSS (pas de Tailwind) ; utiliser des URL d'assets Figma temporaires dans le code.

</frozen-after-approval>

## Code Map

- `frontend/src/style.css` -- aujourd'hui : fond `#fff4e0`, `.card` arrondie avec ombre, boutons `#394060`, `.naive` avec bordure jaune, `.bar` en dégradé. À remplacer par des variables (`--accent`, `--accent-50`, `--accent-200`, `--ink`, `--text`, `--muted`, `--border`, `--surface`) et par les composants de la charte.
- `frontend/index.html` -- charger Geist (Google Fonts, graisses 400, 600 et 700).
- `frontend/src/App.vue` -- l'accueil (`intro`) : titre centré, illustration `/design/robotic-arm-isometric.png` en filigrane (opacité 40 %, rotation -15°, voile radial blanc), bouton « Commencer → » avec mosaïque ; `.atelier` devient un **badge d'étape** (« Atelier 1 » sur fond accent) suivi d'un libellé gris ; barre de progression de 8 px (rail `#D9D9D9`, remplissage accent) ; boutons des missions ; en-tête du score.
- `frontend/src/components/QuizStep.vue` -- cartes de réponse avec pastille de lettre (A, B, C…) ; état sélectionné ou juste en `#FFF7ED` / `#FDBA74` avec pastille accent ; bandeau et explication au style de l'encadré « Réponse sélectionnée » ; méta « Question n sur N » ; bouton principal accent.
- `frontend/src/components/VideoStep.vue` -- carte vidéo : surtitre « VIDÉO INDUSTRIELLE », titre, texte, bouton de lecture rond accent.
- `frontend/src/components/games/*.vue` -- n'harmoniser **que** les commandes HTML (boutons de la pince en carrés noirs comme dans la maquette « Simulation », curseurs et boutons « Continuer » ou « Recommencer » à l'accent) ; ne pas toucher aux scènes 3D.
- `frontend/src/components/HumanoidStep.vue` -- boutons et champs seulement (l'écran sera refondu en v1.6).
- Référence visuelle : `_bmad-output/planning-artifacts/design-figma/*.png`.

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/index.html` + `frontend/src/style.css` -- police Geist et variables de la charte, reset des rayons et ombres, composants communs (`.btn`, `.btn-secondary`, `.badge-step`, `.progress`, `.answer`, `.answer.selected`, `.explain`).
- [ ] `frontend/src/App.vue` -- accueil, badges d'atelier, barre de progression, missions, selon la charte.
- [ ] `frontend/src/components/QuizStep.vue`, `VideoStep.vue` -- selon les maquettes Quiz et Vidéo.
- [ ] Jeux et `HumanoidStep.vue` -- commandes HTML seulement.
- [ ] Vérification -- build ; les 3 tests Playwright passent (adapter les sélecteurs si une classe change, sans toucher à leur logique) ; captures iPhone 13 de l'accueil, d'un quiz et d'une vidéo, comparées aux maquettes ; ne rien commiter ni pousser.

**Acceptance Criteria:**
- Given l'accueil sur iPhone 13, when on le compare à la maquette Intro, then on retrouve le titre centré en Geist Bold, l'illustration en filigrane, le bouton « Commencer → » orange à mosaïque et la barre de progression fine.
- Given une question de quiz, when on sélectionne une réponse, then la carte passe en fond `#FFF7ED` bordé `#FDBA74`, avec une pastille de lettre orange, comme dans la maquette Quiz.
- Given `grep` sur `frontend/src`, when on cherche `#fff4e0`, `#394060` ou `border-radius: 20px`, then aucune occurrence ne subsiste en dehors des scènes 3D.

## Verification

**Commands:**
- `cd frontend && npx vite build` -- attendu : le build réussit
- `smoke-path.mjs`, `smoke-claw.mjs` et `smoke-pour.mjs` dans `/private/tmp/claude-501/-Users-piandrie-work-git-robotic-education/183727a3-c017-445d-96b2-17fe61c9b7f8/scratchpad/` -- attendu : `ERRORS []`

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | blind+edge | mauvaise et bonne réponse au même orange | medium | `selected` sur les deux ; seuls ✓/✗ et un pointillé les distinguent | patch |
| 2 | blind+edge | mission : choix erroné non signalé ; boutons actifs après le choix | medium | `dim` sur tous les autres ; pas de `disabled` | patch |
| 3 | blind | région live créée en même temps que son texte ; pas de région pour les missions | low | `v-if` sur le parent | patch |
| 4 | blind | chrono : l'urgence n'est plus rouge | low | `.hurry` = `--accent-strong` | patch |
| 5 | blind | Geist chargé depuis Google Fonts (IP des élèves, hors ligne) | medium | `<link>` fonts.googleapis.com ; public scolaire | patch (auto-hébergement) |
| 6 | edge+blind | `100dvh` sans repli | low | règle ignorée sur Safari < 15.4 | patch |
| 7 | edge | « Commencer → » déborde sous 380 px | low | 32 px + padding de 144 px | patch |
| 8 | blind | flèches de la pince à 46 px (< 48 px) | low | largeur réduite de 56 à 46 px | patch |
| 9 | blind+edge | rayons et ombres restants dans les surcouches des jeux | low | règles scoped qui l'emportent sur `*` | patch |
| 10 | blind | survol collant sur tactile, plus d'état `:active` | low | `:active` supprimés | patch |
| 11 | blind | `.sr` incomplet et local | low | pas de margin/clip-path ; parent non positionné | patch |
| 12 | blind | noms accessibles génériques de la vidéo | low | « Lire la vidéo » / « Vidéo » | patch |
| 13 | blind | commentaire d'en-tête inexact ; CSS mort | low | couleurs restantes dans les jeux ; `--dot` inutilisé | patch |
| 14 | edge | « / 3 » perdu dans le badge d'atelier | low | information retirée sans que la spec le demande | patch |
| 15 | blind+edge | focus invisible sur les pastilles de couleur, repli des variables du canvas | low | `HumanoidStep.vue` est réécrit par la v1.6 | rejeté (remplacé par la v1.6) |
| 16 | edge | « Score actuel », titre de vidéo fusionné | low | libellés conformes aux maquettes Figma | rejeté |
| 17 | edge | fond du canvas de SortGame modifié | low | changement de couleur inoffensif (blanc de la charte) | rejeté |
| 18 | edge | plus de 8 propositions → pastille vide | false | 4 propositions au plus dans le contenu | rejeté |
| 19 | edge | champ `color` de content.json orphelin | low | donnée inoffensive ; content.json est aussi modifié par la v1.5 | rejeté |
| 20 | vgap | retours du quiz (faux, juste, temps écoulé) non vérifiés ; tests qui ne peuvent pas échouer | medium | le test clique toujours la 1re proposition ; sortie 0 | patch (tests) |
| 21 | vgap | tests hors du dépôt | medium | déjà reporté | defer (existant) |
