---
title: 'v1.6 — Le robot de l’utilisateur, construit au fil du parcours, avec sa photo'
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

**Problem:** L'humanoïde n'apparaît qu'à la toute fin, dessiné de façon simpliste ; « Ajouter à mon robot » ne montre rien au moment où l'on gagne la pièce, et le résultat n'est pas personnel (retours de Cyril, page 5 et écran final : « il faudrait qu'on visualise le robot au fur et à mesure », « à revoir pour faire plus moderne, inclure la photo de l'utilisateur »).

**Approach:** Afficher le robot en construction à chaque pièce gagnée (la nouvelle pièce s'anime en se posant dessus), le redessiner dans un style plus moderne, et intégrer à la fin une photo de l'utilisateur, sans qu'aucune image ne quitte son téléphone.

**Décisions :**
- **Photo :** prise avec la **caméra frontale depuis le navigateur**. Un aperçu en direct (`getUserMedia`, `facingMode: 'user'`) avec un bouton pour déclencher ; si la caméra est refusée ou indisponible, repli sur `<input type="file" accept="image/*" capture="user">`.
- **Rendu final :** un **diplôme façon badge** (« Diplôme de roboticien·ne de la halle technique Robolution »), qui réunit la photo, le prénom ou le pseudo saisi, le robot, les 3 ateliers validés et le score. **L'utilisateur autorise l'usage des éléments graphiques de la JVMA (logo, charte)** : le diplôme porte le logo JVMA, fourni dans `frontend/public/brand/`.
- **Robot :** un **humanoïde en 3D** (three.js, chargé à la demande comme dans les jeux), qui tourne doucement ; ses pièces (axe linéaire, ventouse, poignet) apparaissent au fil des ateliers.

## Boundaries & Constraints

**Always:** la photo reste sur l'appareil (aucun envoi au serveur, aucun stockage en dehors de la mémoire de la page) ; la photo est facultative (on peut terminer sans) ; l'image finale se télécharge toujours en PNG ; tout fonctionne sur smartphone.

**Never:** utiliser d'autres fichiers JVMA que ceux fournis ou validés par l'utilisateur, ni les déformer ou les recolorer ; collecter une donnée personnelle ; envoyer la photo à l'API ou à un service tiers ; modifier les jeux ou le quiz.

</frozen-after-approval>

## Code Map

- **Charte (v1.4, développée en parallèle) :** styler tout nouvel élément avec les variables CSS de la charte HackRobotique, avec valeur de repli, par exemple `var(--accent, #EA580C)`, `var(--accent-50, #FFF7ED)`, `var(--accent-200, #FDBA74)`, `var(--ink, #0F172A)`, `var(--text, #475569)`, `var(--muted, #64748B)`, `var(--border, #CBD5E1)` ; police `Geist, system-ui, sans-serif` ; angles droits. Référence : `{project-root}/_bmad-output/planning-artifacts/design-figma/charte-hackrobotique.md`. Ne pas modifier `style.css` au-delà de l'ajout de classes propres à ce chantier.

- `frontend/src/components/HumanoidStep.vue` -- l'écran final actuel : un dessin en canvas 2D (tête, corps, jambes-rails, bras droit 6 axes, ventouse), un nom, des couleurs et le téléchargement en PNG. À refondre.
- `frontend/src/App.vue` -- l'étape `piece` (« Ajouter à mon robot ») : y afficher le robot en construction ; `pieces` porte le `slot` de chaque pièce (legs, hand, arm).
- `backend/app/content.json` -- `piece.slot` et `piece.image` (v1.4).
- `frontend/public/brand/` -- logo JVMA officiel (`logo-jvma.svg`), icône, et `README.md` de la charte : orange `#FF6E30`, police Lato. À utiliser pour le diplôme.

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/src/components/Robot3D.vue` -- nouvel humanoïde en 3D (three.js chargé à la demande, repli en image fixe si WebGL échoue) ; reçoit `pieces` (slots `legs`, `hand`, `arm`) et une couleur ; anime l'arrivée d'une nouvelle pièce ; rotation lente ; expose `toDataURL()` pour capturer une image (`preserveDrawingBuffer`).
- [ ] `frontend/src/App.vue` -- étape `piece` : afficher `Robot3D` avec la pièce qui arrive, au lieu du seul emoji ou de la seule photo (la photo de la pièce, v1.4, reste en vignette).
- [ ] `frontend/src/components/HumanoidStep.vue` -- refonte : robot 3D, choix de la couleur, prénom ou pseudo, prise de la photo (caméra frontale en direct, repli sur l'input fichier), puis composition du diplôme en canvas 2D (photo, prénom, capture du robot, 3 ateliers, score, date) ; bouton « Télécharger mon diplôme » en PNG ; bouton « Sans photo » ; la caméra est coupée (`track.stop()`) dès la photo prise et au démontage.
- [ ] Vérification -- build ; `smoke-path.mjs` va jusqu'au diplôme et télécharge le PNG (caméra simulée par Playwright avec `--use-fake-device-for-media-stream` et `--use-fake-ui-for-media-stream`) ; les tests des jeux passent toujours ; ne rien commiter ni pousser.

**Acceptance Criteria:**
- Given une pièce gagnée, when l'étape « pièce » s'affiche, then le robot 3D montre toutes les pièces déjà obtenues, et la nouvelle arrive en s'animant.
- Given la caméra refusée, when on veut ajouter sa photo, then le sélecteur de fichier s'ouvre, et le diplôme reste possible sans photo.
- Given le diplôme généré, when on inspecte le réseau, then aucune requête n'emporte la photo.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | blind+edge | caméra laissée allumée (double appui, autorisation tardive après « Sans photo ») | high | `startCamera` sans garde ; `stream` écrasé ; pas de contrôle de l'étape à la réponse | patch |
| 2 | blind+edge+vgap | repli fichier : `capture` ouvre la caméra, ouverture auto bloquée après `await` | medium | input `capture="user"` ; `openPicker()` après `await` | patch |
| 3 | blind+edge+vgap | `compose()` sans try/finally → « Préparation… » indéfiniment | medium | aucune gestion d'erreur | patch |
| 4 | edge | téléchargement d'un PNG périmé pendant le délai | low | bouton actif pendant le délai de 250 ms | patch |
| 5 | blind | enregistrement sur iOS (`download` sur une data URL) | medium | Safari iOS ignore souvent `download` sur une data URL ; cible mobile | patch |
| 6 | blind+edge | logo : ratio codé en dur ; SVG sans taille (Firefox) | low | `114.1/53.4` en dur ; SVG sans width/height | patch |
| 7 | blind | police pas chargée au dessin | low | pas d'attente de `document.fonts` | patch |
| 8 | edge | `fitText` s'arrête à 22 px | low | condition de boucle | patch |
| 9 | blind | regex avec caractères invisibles ; couleurs lues en hex ; description figée | low | corrections directes | patch |
| 10 | edge | « Reprendre » sans retour possible | low | l'étape « ask » n'offre que « Sans photo » | patch |
| 11 | blind | capture du robot floue | medium | canvas à taille d'écran agrandi dans le diplôme | patch |
| 12 | blind | `preserveDrawingBuffer` inutile ; contextes WebGL non libérés | low | jusqu'à 6 montages three par parcours | patch |
| 13 | blind | le diplôme n'utilise pas #FF6E30 ni Lato | false | choix validé : charte Figma pour l'app, logo JVMA d'origine | rejeté |
| 14 | blind+vgap | `piece.image` jamais défini | false | apporté par la v1.5, fusionnée avant | rejeté |
| 15 | blind+edge | `ateliers` indéfinis ou moins de 3 | low | le contenu en a toujours 3, avec `robot` | rejeté |
| 16 | edge | pièce retirée pendant son animation | false | les pièces ne sont jamais retirées | rejeté |
| 17 | blind | recalcul de `opaqueBox` à chaque frappe | low | coût négligeable après le délai | rejeté |
| 18 | vgap | tests qui ne peuvent pas échouer (caméra, nom de fichier, contenu du diplôme, sortie du test sans WebGL) | medium | `?? false`, `ok(…, true)`, taille > 20 ko seulement | patch (tests) |
| 19 | vgap | état de la scène 3D non observable | medium | `data-slots` reflète les props | defer (avec le harnais de test) |
| 20 | vgap | tests hors du dépôt | medium | déjà reporté | defer (existant) |
