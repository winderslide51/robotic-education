---
title: 'v1.5 — Vraies photos des robots et des pièces'
type: 'feature'
created: '2026-09-25'
status: 'done'
baseline_commit: 'd1ed4598f05770e22b7139bfb32ca45b8c8cc769'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/briefs/brief-robotic-education-2026-09-25/brief.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les robots et les pièces ne sont représentés que par du texte ou des emojis (📏, 🪠, 🦾), ce que Cyril juge « nul » ou incompréhensible (retours sur les pages 2, 5, 10, 11 et 14) : un débutant ne voit jamais à quoi ressemble un vrai robot cartésien, SCARA ou 6 axes, ni une vraie ventouse.

**Approach:** Afficher de vraies photos sous licence libre (Wikimedia Commons) : une photo de chaque robot sur l'écran « C'est quoi un axe ? » et à l'accroche de chaque atelier, et une photo de chaque pièce gagnée à la place de l'emoji. Chaque photo est hébergée dans l'app et porte le crédit exigé par sa licence.

## Boundaries & Constraints

**Always:** les images sont téléchargées une fois et servies par l'app (`frontend/public/images/`), sans lien direct vers Wikimedia ; chaque image affiche un crédit court et lisible (« Photo : auteur, licence », avec un lien vers la page Commons), conforme à sa licence ; un texte alternatif en français ; les images restent légères (largeur de 800 px au plus, poids de 150 Ko au plus chacune) ; l'app reste utilisable si une image ne charge pas (texte alternatif, pas de mise en page cassée).

**Never:** d'image sans licence libre vérifiée ; de recadrage d'une image CC BY-SA sans conserver la licence ; de modification des jeux, du quiz ou de l'humanoïde final (chantier 5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Écran des bases | on ouvre « C'est quoi un axe ? » | chaque famille (cartésien, SCARA, 6 axes) montre sa photo et son crédit | N/A |
| Accroche d'un atelier | étape « question » | la photo du robot de l'atelier s'affiche au-dessus de la question | N/A |
| Pièce gagnée | étape « pièce » | la photo de la pièce remplace l'emoji, avec son crédit | N/A |
| Image absente | fichier introuvable | le texte alternatif s'affiche, la mise en page tient | `@error` masque le cadre image |

</frozen-after-approval>

## Code Map

- **Charte (v1.4, développée en parallèle) :** styler tout nouvel élément avec les variables CSS de la charte HackRobotique, avec valeur de repli, par exemple `var(--accent, #EA580C)`, `var(--accent-50, #FFF7ED)`, `var(--accent-200, #FDBA74)`, `var(--ink, #0F172A)`, `var(--text, #475569)`, `var(--muted, #64748B)`, `var(--border, #CBD5E1)` ; police `Geist, system-ui, sans-serif` ; angles droits. Référence : `{project-root}/_bmad-output/planning-artifacts/design-figma/charte-hackrobotique.md`. Ne pas modifier `style.css` au-delà de l'ajout de classes propres à ce chantier.

- `backend/app/content.json` -- ajouter un objet `image` {src, alt, credit, creditUrl} dans `intro.families[]`, dans `blocks[]` (le robot) et dans `blocks[].piece` (le champ `icon` peut rester en secours).
- `frontend/src/App.vue` -- les rendus à enrichir : les cartes `.family` (phase `bases`), l'étape `question` (`.naive`) et l'étape `piece` (`.piece .icon`).
- `frontend/public/images/` -- nouveau dossier des images optimisées (JPEG, 800 px au plus).
- Un composant `frontend/src/components/Photo.vue` (image, crédit, repli `@error`), réutilisé aux 3 endroits.
- Images retenues, toutes vérifiées (HTTP 200, image/jpeg). Récupérer l'original via `Special:Redirect/file/<nom>&width=800` :
  - Cartésien : `Robot Portico tecno-840.jpg`, tecnowey.com, CC BY 3.0 (secours : `SEPRO 5x-35.jpg`, CC BY-SA 4.0, fabricant français).
  - SCARA : `TI S404-01.jpg`, Humanrobo, CC BY-SA 3.0 (secours : `SCARA mit Stocker.jpg`, Hirata Robotics, CC BY-SA 3.0 DE).
  - 6 axes : `Vue de la mini-usine Indulo (Villeurbanne) et de Stäubli TX60, janvier 2024.JPG`, Benoît Prieur, CC0 (secours : `Fanuc robot.jpg`, Biso, CC BY-SA 4.0).
  - Axe linéaire : `Uniline.jpg`, Rollon91, CC BY-SA 3.0.
  - Ventouse : `Robotic arm at work lifting a box during a technology exhibition.jpg`, Shixart1985, CC BY 2.0.
  - Poignet : `Robot ABB 1.jpg`, © Peter Potrowl, CC BY 2.5 (l'auteur demande « © Peter Potrowl » et un lien vers son site : les recopier depuis la page Commons).

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/public/images/` -- télécharger les 6 images, les redimensionner et les compresser (800 px au plus, 150 Ko au plus), avec des noms simples (`cartesien.jpg`, `scara.jpg`, `6axes.jpg`, `axe-lineaire.jpg`, `ventouse.jpg`, `poignet.jpg`).
- [ ] `frontend/public/images/CREDITS.md` -- pour chaque fichier : source, auteur, licence et modifications (redimensionnement).
- [ ] `backend/app/content.json` -- ajouter les objets `image`.
- [ ] `frontend/src/components/Photo.vue` + `frontend/src/App.vue` -- afficher les photos aux 3 endroits, avec crédit et repli.
- [ ] Vérification -- build ; `smoke-path.mjs`, `smoke-claw.mjs` et le test du 6 axes passent toujours ; une nouvelle vérification contrôle que les 6 images se chargent (`naturalWidth > 0`) ; ne rien commiter ni pousser.

**Acceptance Criteria:**
- Given un iPhone 13, when on parcourt l'app, then les photos tiennent dans la largeur sans défilement horizontal, et leur crédit est lisible.
- Given le build de production, when on mesure `frontend/public/images`, then le dossier pèse moins de 1 Mo.

## Verification

**Commands:**
- `cd frontend && npx vite build` -- attendu : le build réussit
- `du -sh frontend/public/images` -- attendu : moins de 1 Mo
- tests Playwright dans `/private/tmp/claude-501/-Users-piandrie-work-git-robotic-education/183727a3-c017-445d-96b2-17fe61c9b7f8/scratchpad/` -- attendu : `ERRORS []` partout, et les 6 images chargées

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | blind | JPG absents du diff | false | exclus volontairement du diff de revue ; `git ls-tree` montre les 6 JPG sur la branche | rejeté |
| 2 | blind | variables de charte non définies | false | définies par la v1.4, fusionnée avant ; valeurs de repli en attendant | rejeté |
| 3 | blind | crédit incomplet pour CC BY / BY-SA ; lien vers le site de Potrowl absent | medium | ni lien vers la licence, ni « modifiée » ; `creditUrl` → Commons seulement | patch |
| 4 | blind | liens externes sans indication ni `rel` | low | `target=_blank` sans `rel`/aria | patch |
| 5 | blind+edge | crédit affiché quand l'image échoue ; `src` manquant → TypeError | low | `figcaption` sans condition ; `computed` sans `?.` | patch |
| 6 | blind | `loading=lazy` sur des images visibles tout de suite | low | 3 usages en lazy | patch |
| 7 | blind | écran des bases trop long sur mobile | medium | 3 × (150 px + légende) | patch |
| 8 | blind+edge | double animation `pop` ; `.family span` stylise le repli | low | `.pop` sur la figure et `.piece .icon` ; sélecteur global | patch |
| 9 | blind | alt du SCARA : une image de synthèse présentée comme une photo | low | CREDITS.md : « image de synthèse » | patch |
| 10 | vgap+blind | aucun contrôle des `image` de content.json | medium | build et déploiement passent avec une image cassée ; le test de fumée sort toujours 0 | patch (script `check-content` dans le build) |
| 11 | blind | objets image dupliqués entre familles et blocs | low | risque de divergence ; restructuration | rejeté |
| 12 | edge | `src` en URL absolue | false | toutes les `src` sont relatives | rejeté |
| 13 | edge | `size` hors `sm`/`md` | false | seuls `sm` et `md` sont utilisés | rejeté |
| 14 | edge | pas de nouvel essai après un échec réseau passager | low | rare ; repli propre | rejeté |
| 15 | edge | commit malgré « ne rien commiter » | false | commit demandé par l'orchestrateur (worktree parallèle) | rejeté |
