---
title: "Addendum — brief robotic-education"
created: 2026-09-25
---

# Addendum

## Veille (recherche web du 2026-09-25, non exhaustive)

### Offres comparables
- **Universal Robots Academy** (academy.universal-robots.com) — gratuit, simulations du pupitre UR, modules de 12 min à 2 h. Formation produit sur le cobot 6 axes, pour opérateurs et intégrateurs.
- **ABB Robotics Academy online / KUKA College e-learning** — modules gratuits sur les bases et les produits. Détail non vérifié.
- **FANUC Tech Transfer** — plus de 200 vidéos techniques gratuites, en anglais.
- **RoboDK for Web / Academy** — simulateur dans le navigateur, plus de 600 robots. Trop technique pour un débutant.
- **Simulateurs open source three.js** (web-6dof-robot-manipulator, ARMBENCH) — démos de cinématique, sans pédagogie.
- **Forindustrie** (France Travail + Éducation nationale) — métavers gratuit, 5 quêtes, quiz, 220 vidéos métiers. Concurrent le plus proche sur l'attractivité de l'industrie, mais généraliste et long. Pas de mini-jeu robot identifié (à vérifier).
- **Industry Race** (UIMM Normandie), **jeu de cartes Onisep**, **concours UIMM** (Robot'Est Challenge) — aucun ne fait distinguer les familles de robots.
- **Manque identifié** : aucun parcours court (15 min), sans compte, en français, qui fasse distinguer cartésien, SCARA et 6 axes par la manipulation, puis les relie aux composants et aux métiers.

### Contexte français
- Technologie cycle 4 (BO n°9 du 29/02/2024, déploiement complet en 3e à la rentrée 2026) : les « robots » sont cités, mais surtout en robotique éducative et mobile.
- Découverte des métiers de la 5e à la 3e (12 h en 4e, 36 h en 3e), avec un objectif affiché de réindustrialisation : point d'entrée institutionnel probable.
- Lycée : STI2D, bac pro MSPC, NSI.
- **Semaine de l'industrie 2026 : du 16 au 22/11/2026**, thème « Avec l'industrie, construis ton avenir ». Environ 130 000 projets de recrutement en 2026. Cible de lancement possible.

### Contraintes techniques et juridiques
- YouTube : paramètres `start`/`end` pris en charge (`end` se compte depuis le début de la vidéo). Façade à clic recommandée pour les cookies. Prévoir un repli si une vidéo est supprimée ou si son intégration est désactivée.
- RGPD : seuil de 15 ans en France, double consentement parent et enfant. Option la plus simple : aucun compte, aucune donnée personnelle, progression stockée localement, aucun traceur.
- 3D : three.js / react-three-fiber, urdf-loader (Apache-2.0) pour de vrais modèles de robots, rapier.js pour la physique. De la 2D ou 2,5D pourrait suffire pour les machines peu puissantes des collèges (avis, non vérifié).

## JVMA — Jules Verne Manufacturing Academy (recherche web du 2026-09-25)
- Usine-école 4.0 à Bouguenais (campus IRT Jules Verne), ouverte en 2021. 3 000 m², une cinquantaine de machines, une ligne de trottinettes électriques comme support pédagogique. Portée par l'association Académie de l'Industrie du Futur (UIMM Pays de la Loire, IRT, Nantes Université, écoles, CFA).
- Environ 4 500 visiteurs par an, dont environ 1 000 étudiants. La « promotion des métiers » est l'un de ses 4 piliers, avec l'accueil de scolaires (primaire, collège, lycée).
- Publics : du CAP à l'ingénieur, apprentis, salariés en formation continue, particuliers et personnes en reconversion.
- Robotique : formations FANUC, KUKA et ABB, cobots, AGV. Idée : filmer ses propres robots pour les extraits vidéo.
- Événements jeunes : Event Industrie UIMM 44 (collégiens), immersions de lycéens, « Immersion Industrie 4.0 » du CESI (avec un quiz robotique).
- Sources : jvma.fr/la-jvma, jvma.fr/categories-formations/robotique, nantes.cesi.fr/agenda/immersion-decouverte-industrie-jvma

## Choix techniques (décision utilisateur, 2026-09-25)
- Front : Vue.js. Back : Python. Hébergement : AWS Amplify.
