# Travaux reportés

- source_spec: none
  summary: Refonte du jeu de la pince (vue 3D, colis ou pièce de trottinette au lieu du nounours, objet non aligné en Y au départ, pas d'avance automatique, message « 3 axes = robot cartésien » en gros).
  evidence: Retours de Cyril (page 3) ; chantier indépendant séparé des textes et de l'habillage (ordre prévu : 2e).
- source_spec: none
  summary: Refonte du jeu du 6 axes (6 curseurs, un par axe, avec l'axe manipulé en surbrillance sur le dessin).
  evidence: Retours de Cyril (page 12) ; chantier indépendant (ordre prévu : 3e).
- source_spec: none
  summary: Vraies photos ou illustrations des robots (cartésien, SCARA, 6 axes) et des pièces, à la place des emojis ; vidéo 6 axes plus lisible.
  evidence: Retours de Cyril (pages 2, 5, 10, 11, 13) ; chantier indépendant (ordre prévu : 4e).
- source_spec: none
  summary: Robot de l'utilisateur visible et construit au fil du parcours, avec un rendu final plus moderne intégrant sa photo.
  evidence: Retours de Cyril (page 5 et écran final) ; chantier indépendant (ordre prévu : 5e).
- source_spec: `_bmad-output/implementation-artifacts/spec-v1-1-textes-et-habillage.md`
  summary: Mettre en place un harnais de test (node --test ou vitest, pytest) couvrant le mélange du quiz (bonne réponse préservée), le mélange des missions et des robots, et le contrat de `content.json` (présence d'`intro`, ids des familles = ids des blocs).
  evidence: Relecture v1.1 : aucun test dans le dépôt, et le test de fumée Playwright ne vit que dans le scratchpad de session.
- source_spec: `_bmad-output/implementation-artifacts/spec-v1-1-textes-et-habillage.md`
  summary: Le titre et la source affichés ne changent pas quand la vidéo de repli (`fallbackId`, autre chaîne) est lue ; ajouter `fallbackTitle` et `fallbackSource`.
  evidence: `VideoStep.vue` bascule sur `fallbackId` si la vignette échoue, mais garde `video.title` et `video.source` ; défaut déjà présent en v1.0.
