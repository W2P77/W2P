# where2spin

Catalogue de machines à sous. Site **indépendant** de BetsRank : dépôt, Vercel,
base et Search Console séparés, et **aucun lien entre les deux sites**.

## Ce qui le distingue

Un jeu n'a pas « un » RTP. Il en a couramment plusieurs :

- celui que publie le studio, par défaut ;
- des paliers que l'opérateur configure, toujours plus bas ;
- un RTP différent quand on achète le bonus, souvent plus haut.

Tous les agrégateurs affichent un chiffre unique, avec le même aplomb. C'est
mesuré : le 06/09/2026, quatre fiches Red Tiger de BetsRank portaient le palier
opérateur au lieu de la valeur studio, et six fiches Nolimit/Hacksaw affichaient
un RTP d'achat de bonus présenté comme celui du jeu.

Le schéma modélise donc les trois, et chaque donnée porte son **niveau de
preuve** (`Confiance`), affiché au visiteur. Publier vite sans mentir : une
nouveauté sort avec `AUCUNE`, et la fiche se bonifie quand la source arrive.

## Ordre de publication

1. **Les nouveautés, en priorité.** C'est la seule fenêtre où un domaine neuf
   peut être premier : un jeu sorti ce matin n'a aucune page concurrente, et la
   page vieillit en gardant sa position si le titre décolle.
2. **Les jeux les plus recherchés**, par vagues. Un domaine neuf qui verse
   20 000 pages d'un coup se fait ignorer, pas récompenser.

## Tracking

Les clics émettent un clickId **préfixé `w2p-`**. Le postback reste celui de
BCE, la base Redis reste partagée : le préfixe suffit à savoir d'où vient chaque
lead, y compris dans la clé primaire de la conversion — qui est permanente,
alors que le clic expire à 90 jours.

Les saisies manuelles doivent produire `manual-w2p-…` **par construction**. Un
champ à ne pas oublier finit toujours par être oublié.

## Commandes

```
npm run dev        développement
npm run build      prisma generate + build
npm run verify     typecheck + lint + tests
```
