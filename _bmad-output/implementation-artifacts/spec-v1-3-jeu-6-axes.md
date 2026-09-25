---
title: 'v1.3 — Jeu du 6 axes avec un curseur par axe'
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

**Problem:** Dans le jeu de la carafe (atelier 3), on ne pilote qu'un seul curseur, l'inclinaison du poignet : l'apprenant ne manipule pas vraiment les 6 axes et ne voit pas quelle articulation correspond à quel axe (retours de Cyril, page 12 : « idée ok, mais il faudrait les 6 axes avec 1 curseur pour chaque ; quand tu bouges, ça met en surbrillance l'axe concerné »).

**Approach:** Garder le défi « verser la carafe dans le verre sans déborder », mais piloter le robot avec 6 curseurs, un par axe. L'articulation concernée s'allume sur le robot pendant qu'on bouge son curseur, avec son nom (« Axe 1 : la base qui tourne »…). Le robot est rendu en 3D (three.js), comme la pince de la v1.2, parce que les axes 1, 4 et 6 tournent dans un plan qu'une vue 2D de côté ne montre pas.

**Décision (revue, question posée à l'utilisateur) :** pour gagner, il faut avoir **bougé les 6 axes** au moins une fois. Tant que ce n'est pas le cas, la victoire n'est pas accordée : un indice indique les axes pas encore essayés (« Essaie aussi l'axe 4 : l'avant-bras qui tourne »), et une pastille marque chaque curseur déjà utilisé.

## Boundaries & Constraints

**Always:** jouable au doigt sur smartphone (iPhone 13), avec les 6 curseurs utilisables sans défiler ou dans un panneau compact ; le composant garde son contrat (`emit('win')` une seule fois, après un bouton « Continuer ») ; pas d'avance automatique ; « Passer le jeu » fonctionne ; un repli si WebGL échoue.

**Never:** modifier les autres jeux, le quiz ou `content.json` en dehors du 6 axes ; ajouter une dépendance autre que `three`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bouger un axe | on fait glisser le curseur de l'axe N | seule l'articulation N bouge ; elle s'allume, et son nom s'affiche | N/A |
| Départ | le jeu s'ouvre | la carafe n'est pas au-dessus du verre : il faut placer le bras (axes 1 à 3) avant d'incliner (axe 5) | N/A |
| Verser | la carafe est au-dessus du verre, et l'axe 5 est incliné | l'eau coule, avec un débit qui dépend de l'inclinaison | N/A |
| Verser à côté | on incline hors du verre | l'eau tombe à côté ; message « Place d'abord la carafe au-dessus du verre » | le verre ne se remplit pas |
| Débordement | le niveau dépasse 100 % | « Ça déborde ! » et un bouton « Recommencer » | la scène est remise à zéro |
| Réussite | le niveau est entre 80 et 95 %, et la carafe est redressée | grand message « Tu as piloté 6 axes ! Le poignet (axes 4-5-6) permet d'orienter l'outil » et un bouton « Continuer » | double clic ignoré |

</frozen-after-approval>

## Code Map

- `frontend/src/components/games/PourGame.vue` -- **le seul fichier à réécrire.** Aujourd'hui : un canvas 2D vu de côté, un seul `<input type="range">` pour l'inclinaison, un flux de particules d'eau, les zones de remplissage (cible 80-95 %, débordement au-delà de 100 %, carafe vide), le libellé « Axe 5 : le poignet », et `emit('win')` environ 800 ms après la réussite (avance automatique à supprimer). À reprendre : la logique de remplissage et de débordement, et les particules.
- `frontend/src/components/games/ClawGame.vue` (v1.2) -- **modèle à suivre** pour la mise en place de three.js (three chargé à la demande par `await import('three')` avec l'état « Chargement de la 3D… », renderer, caméra en 3/4, nettoyage dans `onUnmounted`, repli WebGL et perte de contexte, garde clavier sur les éléments interactifs, `roundRect` optionnel, écran de réussite avec focus sur « Continuer »). Réutiliser les mêmes conventions ; si un utilitaire commun émerge naturellement, le mettre dans `frontend/src/games3d.js`.
- `frontend/src/App.vue` -- monte le jeu par `@win="nextStep"`. Ne pas modifier.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/components/games/PourGame.vue` -- un robot 6 axes en three.js (base, épaule, coude et poignet à 3 rotations, avec la carafe au bout), un verre posé sur la table ; 6 curseurs, un par axe, nommés en langage simple (1 : base qui tourne, 2 : épaule, 3 : coude, 4 : avant-bras qui tourne, 5 : poignet qui s'incline, 6 : main qui tourne) ; mise en surbrillance de l'articulation active ; l'eau coule selon l'orientation réelle de la carafe ; recommencer et réussir selon la matrice ; repli WebGL.
- [x] Vérification -- build ; le test de fumée joue le jeu pour de vrai (curseurs réglés par programme jusqu'à la réussite, puis « Continuer ») ; ne rien commiter ni pousser.

**Acceptance Criteria:**
- Given un iPhone 13, when on arrive sur le jeu, then la scène et les 6 curseurs sont utilisables sans que la page défile hors de la scène (un panneau de curseurs compact est accepté).
- Given n'importe quel curseur, when on le bouge, then le nom de l'axe correspondant s'affiche et son articulation s'allume sur le robot.

## Design Notes

Une chaîne cinématique simple suffit : chaque axe est un `THREE.Group` enfant du précédent, et on règle sa rotation (Y pour 1, Z pour 2, 3 et 5, X pour 4 et 6). L'eau coule quand l'ouverture de la carafe descend sous son fond (produit scalaire entre l'axe de la carafe et la verticale) ; la position monde du bec (`getWorldPosition`) dit si le flux tombe dans le verre.

## Verification

**Commands:**
- `cd frontend && npx vite build` -- attendu : le build réussit
- dans `/private/tmp/claude-501/-Users-piandrie-work-git-robotic-education/183727a3-c017-445d-96b2-17fe61c9b7f8/scratchpad/` (serveur `npx vite --port 5173` dans `frontend/`) : créer `smoke-pour.mjs` sur le modèle de `smoke-claw.mjs` -- attendu : `ERRORS []`, le jeu du 6 axes est gagné pour de vrai ; ne pas modifier `smoke-claw.mjs` ni `smoke-path.mjs`, qui doivent toujours passer (`ERRORS []`)

## Implementation Notes

- **Seuil de versement** : l'eau ne coule pas seulement quand l'ouverture passe sous le fond (90°) : l'inclinaison est bien l'angle entre l'axe de la carafe et la verticale (produit scalaire), mais le seuil part de 35° (carafe pleine) et monte jusqu'à 65° quand elle se vide. Le débit croît avec l'écart au seuil (max 0,3 verre/s), ce qui ralentit naturellement en fin de remplissage. Au-delà de 120° : « Trop vite, ça éclabousse ! » (jet dispersé).
- **Point de sortie** : le bec (`getWorldPosition`) quand il est du côté le plus bas, sinon le point le plus bas du bord (cas où les axes 4 ou 6 font pencher la carafe sur le côté). Un repère au sol (rose → vert) montre où tomberait l'eau.
- **Remplissage** : chaque goutte porte un volume ; elle ne compte que si elle passe le bord du verre à l'intérieur de son rayon. Réussite = niveau 80-95 %, carafe redressée (< 35°) et plus aucune goutte en l'air.
- **États d'échec ajoutés** (hors matrice, pour ne jamais bloquer le joueur) : « Un peu trop ! Vise le trait vert. » (entre 95 et 100 %, carafe redressée) et « La carafe est vide ! », tous deux avec « Recommencer ».
- **Placement du verre** : calculé au chargement à partir d'une pose de référence (`SOLUTION`, base 140°, épaule 20°, poignet 35°), donc toujours atteignable. Pose de départ : tout à 0, carafe loin du verre.
- **`games3d.js` non créé** : le seul utilitaire commun possible (textures, nettoyage) aurait obligé à modifier `ClawGame.vue`, ce qui est interdit.
- **Après revue** : le repère et le message visent le point d'impact prédit au niveau du bord du verre (vitesse du jet + gravité), avec un seul rayon (`HIT_R`) pour le repère, le message et le comptage. Une goutte ne compte que si elle franchit le bord en descendant. Une carafe plus basse que le bord du verre (+ 5 cm) ne verse pas (« Remonte la carafe »). Vitesse du jet réduite (0,15 à 0,35), pour que le point d'impact bouge moins pendant qu'on verse.
- **Les 6 axes sont obligatoires** (décision de l'utilisateur) : chaque curseur bougé reçoit une pastille ✓ (la mémoire est gardée après « Recommencer »). Tant qu'un axe n'a pas été essayé, un verre réussi ne donne pas la victoire : on affiche « Essaie aussi l’axe N : … » pour le premier axe manquant.
- **Test** : `smoke-pour.mjs` (scratchpad) expose l'état via `data-level`, `data-over`, `data-status`, `data-active` sur `.pour` et `data-axis` sur chaque curseur. Il vise en balayant les curseurs 1 et 2 jusqu'à ce que le repère soit au-dessus du verre (sans connaître la pose de référence).

## Spec Change Log

## Review Triage Log

| # | Couche | Constat | Verdict | Preuve | Route |
|---|---|---|---|---|---|
| 1 | blind+edge+vgap | le marqueur ignore la dérive horizontale des gouttes ; rayons différents | medium | `dir*(0.2+0.5*frac)` vs projection verticale ; `GLASS_R-0.04` vs `-0.02` | patch |
| 2 | blind+edge | la carafe traverse la table ou le verre : eau perdue ou comptée contre le message | medium | gouttes émises sous `GLASS_H` comptées dès la 1re frame ; `isOverGlass` exige `y > GLASS_H-0.02` | patch |
| 3 | blind+edge | volume perdu au plafond `MAX_DROPS` | low | `carafe -= out` avant la boucle bornée | patch |
| 4 | edge | « C'est bon ! Redresse » au-dessus de 95 % | low | condition `level >= TARGET_MIN` sans borne haute | patch |
| 5 | blind | focus perdu et surcouche d'échec non annoncée | low | curseur `disabled`, pas de `role="alert"` | patch |
| 6 | blind | pas de piège à focus ni d'Échap sur le dialogue de victoire | low | amélioration, pas de défaut bloquant | rejeté |
| 7 | blind | allocations à chaque frame, variable `tilt` inutilisée, apostrophe | low | `new THREE.Vector3()` dans `pourGeometry`, `drops.filter` | patch |
| 8 | blind | style `.msg.ok` lié au libellé | low | aucun défaut visible | rejeté |
| 9 | blind+edge | largeur 0 → fov infini ; fov non borné | low | conteneur toujours visible au montage | rejeté |
| 10 | edge | `ResizeObserver` hors try | low | disponible sur les cibles | rejeté |
| 11 | edge | une exception dans la boucle fige le jeu | low | aucun chemin d'exception démontré | rejeté |
| 12 | edge | pas de reprise après `webglcontextrestored` | low | rare ; « Passer le jeu » reste disponible | rejeté |
| 13 | edge | suppression de l'avance automatique | false | voulue par la spec (matrice : « pas d'avance automatique ») | rejeté |
| 14 | blind | les axes 4 et 6 ne sont jamais nécessaires, alors que la victoire dit « Tu as piloté 6 axes ! » | medium | seuls les axes 1, 2, 3 et 5 conditionnent la victoire ; l'intention ne dit pas si les 6 axes doivent être utilisés | intent_gap → résolu par l'utilisateur (option A : exiger les 6 axes), appliqué comme correctif |
| 15 | vgap | états toomuch/empty et plafond de 95 % non testés | medium | `smoke-pour.mjs` ne les atteint pas | patch (test) |
| 16 | vgap+blind | le test vit hors du dépôt | medium | déjà reporté (harnais de test) | defer (existant) |
