---
source: .memlog.md (brainstorming 2026-09-25)
sujet: Application web pédagogique sur la robotique (cartésien → SCARA → 6 axes)
---

# Intention — App pédagogique robotique

## Vision
Faire comprendre la robotique industrielle à des débutants en 15 minutes, par le jeu : on manipule d'abord, on nomme ensuite.

## Public cible
- Parcours unique conçu pour Léa, 15 ans, sans connaissance en robotique (elle décroche s'il y a trop de texte, si c'est trop technique ou pas assez interactif).
- Même parcours pour les enseignants et les adultes qui découvrent le secteur (ex. Julien, 29 ans, nouveau chargé d'affaires non technicien chez un intégrateur, qui doit savoir quel robot proposer).

## Noyau (indispensable)
1. **3 jeux, un par robot** :
   - Pince de fête foraine (attrape-peluche, manette/boutons) → **cartésien**
   - Tri express de bonbons sur tapis roulant (pick & place rapide) → **SCARA**
   - Verser la carafe dans un verre (incliner trop vite = débordement) → **6 axes**
2. **Pièces à gagner** pour construire et personnaliser un **robot humanoïde virtuel**. Les pièces sont de vrais composants (rail linéaire, ventouse, poignet/servomoteur, réducteur, capteur de force, pince…) avec une fiche de 2 lignes et une vidéo d'usage réel.
3. **Parcours de 15 min max**, en une seule session : 5 min par robot.

## Structure du parcours
Chaque robot = un bloc de 5 min :

| Temps | Séquence | Contenu |
|---|---|---|
| 0:30 | Question naïve d'accroche | ex. « C'est quoi un axe ? », « Pourquoi 6 axes ? » |
| 1:30 | Jeu de manipulation | le jeu du robot (pince / tri / carafe) |
| 0:45 | Extrait vidéo réel | le même geste dans l'industrie (bouton « voir la vraie version ») |
| 0:45 | Maquette 3D + pièce gagnée | la pièce débloquée remplit ce créneau et porte le contenu |
| 1:30 | Quiz chrono + mise en situation | façon Kahoot |

Ordre : cartésien → SCARA → 6 axes. Le bloc 6 axes se termine par la mise en situation finale « quel robot choisir ? ».

## Principes pédagogiques
- Peu de texte, zéro jargon, interactivité maximale dès les premières secondes.
- Manipuler d'abord, nommer ensuite (le mot « axe » n'apparaît qu'après la réussite).
- Expliquer sans texte : animation 3D de chaque robot en mouvement.
- Style « C'est pas sorcier » : questions naïves et maquette. La maquette est un robot 3D interactif (vue éclatée ou transparente, qu'on tourne et qu'on démonte).
- 6 axes expliqué par l'analogie avec notre bras. Boucle narrative : le bras de l'humanoïde construit est lui-même un 6 axes.

## Contenus & évaluation
- Vidéos : extraits YouTube courts (début et fin paramétrés), sourcés et légitimes, avec un **badge de source** (fabricant officiel, émission éducative, chaîne vérifiée).
- Quiz rythmés façon Kahoot : chrono, retour immédiat avec explication, bonus de rapidité.
- Les questions ratées reviennent dans le quiz final de la même session (pas de répétition sur plusieurs jours).
- Mise en situation finale « quel robot choisir ? » : replacer un cas dans son contexte et choisir entre cartésien, SCARA et 6 axes. Le duel cartésien contre 6 axes sur la carafe (le cartésien échoue car il ne peut pas incliner) l'illustre sans texte.
- Récompense finale : une image du robot humanoïde construit.

## Idées secondaires à arbitrer
- Personnage acolyte naïf (façon Fred) qui pose les questions que l'apprenant n'ose pas poser
- Étiquette de prix par robot (répond à « ça coûte combien ? »)
- Permis robot (cartésien, SCARA, 6 axes) validés par quiz et mise en situation
- Certificat ou carte d'identité du robot (composants et permis obtenus) joint à l'image
- Mode miroir webcam : le robot 3D imite le bras de l'apprenant
- Défi « Compte tes axes » (bras humain ≈ 7 degrés de liberté contre 6)
- Fil rouge « fête foraine des robots » : chaque stand = un robot à débloquer
- Vidéo d'accueil de 10 s montrant un robot réel, avec une seule question
- Questions naïves en plus : « Peut-il se blesser ou me blesser ? », « Qui lui dit quoi faire ? »

## Hors périmètre
- Gestes « se frotter le dos » et « se brosser les dents » (seul le remplissage de la carafe est retenu)
- Persona opérateur d'usine inquiet (Karim)
- Mode classe / collectif (vote par téléphone, rôles, pilote désigné)
- Parcours séparés par public, simulateur de rendez-vous client
- Mécaniques sur plusieurs jours (série de jours, répétition espacée)

## Questions ouvertes
- **RGPD** : envoyer l'image par email à des mineurs exige le consentement parental (moins de 15 ans en France). Alternative proposée : téléchargement direct de l'image, sans collecte de données. À trancher.
- **15 min contre mécaniques sur plusieurs jours** : tranché en séance, avec une seule session et les erreurs reprises dans le quiz final. À confirmer.
