# Charte graphique HackRobotique (source Figma)

Fichier : https://www.figma.com/design/wpKOTiCsHqB4wShhfjZBQs/HackRobotique
Écrans mobiles de référence (402 × 874) : Intro `1:4`, Simulation `5:29`, Quiz `6:74`, Vidéo `9:198`. Les captures d'écran sont dans ce dossier.
Aucune variable Figma n'est définie : les valeurs ci-dessous sont relevées directement dans les calques.

## Couleurs

| Rôle | Valeur |
|---|---|
| Accent (boutons, badges, progression) | `#EA580C` |
| Accent clair (mosaïque du bouton) | `#E98E5E` et `#F9C4A8` |
| Fond « sélectionné » ou « réponse » | `#FFF7ED`, bordure `#FDBA74` |
| Titres | `#0F172A` (et noir pour le titre de l'accueil) |
| Texte courant | `#475569` |
| Texte secondaire | `#64748B`, puce `#94A3B8` |
| Bordures | `#CBD5E1` |
| Fond des pastilles neutres | `#F8FAFC` |
| Rail de la barre de progression | `#D9D9D9` |
| Fond de page | `#FFFFFF` |

## Typographie

Police **Geist** (libre, disponible sur Google Fonts).
- Titre de l'accueil : Bold 36 px, centré.
- Question du quiz : Bold 22 px, interligne 1,4.
- Bouton principal de l'accueil : Bold 32 px, blanc.
- Texte courant : Regular 14 px, interligne 1,5 à 1,6.
- Réponse choisie : SemiBold 14 px.
- Méta (« Question 4 sur 5 », score) : SemiBold 13 px.
- Badge d'étape : Bold 11 px, blanc sur accent.

## Formes et espacements

- **Angles droits** partout (boutons, cartes de réponse, badges). Seules exceptions : les pastilles de lettre A, B, C (32 px, rayon 16) et la carte de question (rayon 16, sans bordure).
- Barre de progression : 8 px de haut, marges de 16 px, rail gris et remplissage accent.
- Marges de page : 16 px. Carte : padding 28 px, gap 20 px. Réponses : padding 16 px, gap 12 px.
- Boutons : principal plein accent (padding 12 × 20, Bold 14, blanc) ; secondaire blanc bordé `#CBD5E1` (SemiBold 14, `#475569`) ; « Passer » en contour gris.
- Bouton d'accueil « Commencer → » : pleine largeur, 60 px de haut, avec une **mosaïque de carrés de 15 px** (`#E98E5E`, `#F9C4A8`) aux deux extrémités.

## Composants repérés

- **Badge d'étape** (« Étape 1 ») + libellé gris (« Simulation », « Question unique »).
- **Carte de réponse** avec pastille de lettre ; état sélectionné en `#FFF7ED` / `#FDBA74`, pastille pleine accent.
- **Encadré d'explication** (« Réponse sélectionnée ») : même fond, pastille contour accent.
- **Carte vidéo** : surtitre accent en capitales (« VIDÉO INDUSTRIELLE »), titre Bold, texte gris, lecteur au bouton rond accent, bouton « Découvrir un nouveau robot ».
- **Simulation** : objectif en gras, scène sur fond `#FFF7ED` bordé d'accent, croix directionnelle en carrés noirs, bouton rond noir.
- **Accueil** : illustration isométrique d'un bras robot en fond (opacité 40 %, rotation -15°) sous un voile radial blanc ; fichier : `frontend/public/design/robotic-arm-isometric.png`.
