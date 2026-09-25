---
title: "Brief produit — robotic-education"
status: draft
created: 2026-09-25
updated: 2026-09-25
---

# Brief produit — robotic-education

## En bref

Une application web, accessible en scannant un QR code, qui fait comprendre la robotique industrielle à un débutant complet en **15 minutes**, **par le jeu**. On découvre trois robots, le **cartésien**, le **SCARA** et le **6 axes**, en les pilotant dans un mini-jeu avant d'apprendre leur nom. À chaque étape, on gagne une vraie pièce de robot pour construire son propre humanoïde virtuel.

Le projet est réalisé dans le cadre d'un **hackathon**. La **JVMA (Jules Verne Manufacturing Academy)** pourrait l'utiliser pour faire découvrir la robotique et ses métiers.

## Le problème

- Pour un jeune ou un adulte non initié, « robot industriel » ne veut rien dire de concret. Il ne sait ni ce qu'est un axe, ni pourquoi il existe différents robots, ni à quoi chacun sert.
- Les ressources existantes sont soit **trop techniques** (les formations des fabricants, les simulateurs comme RoboDK), soit **trop générales et trop longues** (les jeux de découverte de l'industrie comme Forindustrie).
- Ce public décroche dès qu'il y a **trop de texte, trop de jargon, pas assez d'interaction**.

## La solution

Un parcours unique de 15 minutes, en trois blocs de 5 minutes, un par robot :

| Robot | Mini-jeu | Ce qu'on comprend |
|---|---|---|
| Cartésien | **La pince de fête foraine** : attraper une peluche | Se déplacer en ligne droite (X, Y, Z) |
| SCARA | **Le tri express** : trier des bonbons sur un tapis roulant | La vitesse de prise et de dépose à l'horizontale |
| 6 axes | **La carafe** : verser de l'eau sans déborder | Orienter l'outil, comme un bras humain |

Chaque bloc suit le même rythme : une **question naïve** pour accrocher (« C'est quoi un axe ? »), le **jeu**, un **extrait vidéo réel** et sourcé du même geste dans l'industrie, la **pièce gagnée** (un vrai composant, avec une explication de 2 lignes), puis un **quiz chronométré** façon Kahoot.

Le parcours se termine par une **mise en situation**, « quel robot pour ce besoin ? », et par l'**image de l'humanoïde construit**, à télécharger.

**Principes :** on manipule d'abord et on nomme ensuite ; peu de texte, pas de jargon ; ça se joue au doigt sur smartphone ; pas de compte ni de donnée personnelle.

## Ce qui le distingue

- **15 minutes, sans compte, directement depuis un QR code.** C'est fait pour un salon, une porte ouverte ou une visite scolaire.
- **On distingue les familles de robots en les manipulant.** Nous n'avons pas trouvé d'équivalent en français (recherche non exhaustive, voir l'addendum).
- **La récompense apporte elle-même du contenu** : chaque pièce gagnée est un vrai composant de robot.

## Pour qui

- **Cible de conception : Léa, 15 ans**, curieuse mais sans aucune notion. Si c'est clair pour elle, ce sera clair pour tous.
- **Mêmes parcours pour :** les enseignants, et les adultes qui découvrent le secteur (reconversion, nouvelles recrues non techniques).
- **Diffuseur :** la JVMA, une usine-école 4.0 qui reçoit environ 4 500 visiteurs par an (dont des scolaires, du collège au lycée) et dont l'un des piliers est la promotion des métiers. Le QR code serait proposé lors des visites et des événements, et les extraits vidéo pourraient montrer ses propres robots FANUC, KUKA et ABB. [HYPOTHÈSE : usages exacts à confirmer avec la JVMA]

## Critères de réussite

**Pour le hackathon** (dans 2 h) :
- Une démo jouable de bout en bout depuis un QR code, sur smartphone. Au minimum : **un bloc complet**, par exemple le cartésien avec la pince, la vidéo, la pièce et le quiz, puis l'enchaînement vers les autres robots.
- Le jury comprend la différence entre les 3 robots en moins de 2 minutes de démo.

**Ensuite** [HYPOTHÈSE : indicateurs à valider avec la JVMA] :
- Plus de 70 % des joueurs terminent le parcours.
- Plus de 70 % choisissent le bon robot lors de la mise en situation finale.

## Périmètre

**Démo du hackathon** (par ordre de priorité) :
1. Le jeu de la pince (cartésien), jouable sur mobile.
2. Le squelette du parcours : les 3 blocs, les vidéos, les quiz et la pièce gagnée.
3. Les jeux du tri (SCARA) et de la carafe (6 axes), éventuellement simplifiés.
4. La mise en situation finale et l'image de l'humanoïde.

**Hors périmètre :** les comptes utilisateurs et l'envoi par email, le mode classe ou collectif, les parcours différents selon le public, les mécaniques sur plusieurs jours, la webcam.

**À arbitrer plus tard :** l'acolyte naïf, l'étiquette de prix par robot, les « permis robot », le défi « Compte tes axes ».

## Questions ouvertes

- Quels besoins précis de la JVMA ? (Quels publics, quels événements, quel hébergement, quelle marque.)
- Les droits sur les extraits vidéo : utiliser l'intégration YouTube, avec une solution de repli si une vidéo disparaît.
- Faut-il de la 3D, ou la 2D suffit-elle pour tourner sur les téléphones et les ordinateurs des collèges ?

## Et après

Faire de l'app l'outil de découverte de la robotique de la JVMA, utilisé à chaque visite et à chaque événement (par exemple la Semaine de l'industrie, du 16 au 22 novembre 2026). On pourrait ensuite ajouter d'autres robots (delta, cobot, mobile) et relier chaque robot aux métiers et aux formations proposés.
