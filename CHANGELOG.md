# Carnet de bord — where2play

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

## 2026-09-07 — La charte : biseau, polices, tracés

**Le rendu ne ressemblait pas à la maquette, et la cause n'était pas la
couleur.** Trois écarts structurels, par ordre d'effet :

1. **Les panneaux étaient arrondis.** Toute l'identité tient sur une découpe à
   45° en haut à gauche et en bas à droite, avec un liseré néon qui suit la
   coupe. Un `border-radius`, même généreux, donne un site sombre ordinaire.
   Le liseré ne peut pas être une `border` — elle suit le rectangle et
   s'interrompt dans les angles ; il faut empiler deux formes biseautées, le
   dégradé dessous et le fond du panneau dessus, à un pixel près. Le halo
   passe par `filter`, jamais `box-shadow`, qui ignore le `clip-path`.
2. **Aucune police n'était chargée.** Le site tombait sur Segoe UI. Ajout de
   Saira Condensed (titres), Chakra Petch (navigation, libellés — ses angles
   coupés reprennent le biseau à l'échelle de la lettre) et Barlow (texte).
3. **Il manquait la troisième teinte.** Deux néons se lisent comme un
   dégradé ; trois se lisent comme un circuit. L'orange est réservé aux
   tracés — jamais un état, jamais une donnée.

Ajouts : logo tracé (l'emoji 🎰 changeait d'aspect selon l'appareil et ne
prenait pas la couleur de la charte), plateau biseauté sous la barre de
recherche, colonne « Latest guides & reviews », conduites néon coudées.

**Pièges payés :**

- Le tracé de circuit passait **sous le dernier lien de navigation** :
  « ACCOUNT » se lisait sur un enchevêtrement de traits. Il a désormais sa
  propre bande au-dessus de la barre — baisser l'opacité l'aurait rendu sale
  au lieu d'illisible.
- `rtpStudio` arrive de Prisma en **`Decimal`**, et partait tel quel au
  composant client de l'étoile d'enregistrement. Un Decimal ne survit pas à
  `JSON.stringify` : la liste « mes jeux » gardait `{"s":1,"e":1,"d":[…]}` à
  la place du RTP. Le symptôme n'apparaissait qu'après avoir enregistré un jeu
  **puis rouvert la page**.
- **`npm run verify` ne pouvait pas tourner.** Sans configuration ESLint,
  `next lint` n'échouait pas : il ouvrait une invite interactive et restait
  suspendu. Une garde qui ne rend jamais la main laisse passer tout ce qu'elle
  devait arrêter. Configuré — et il a immédiatement trouvé cinq `<a>` internes
  qui provoquaient un rechargement complet au lieu d'une navigation.
- **Fausse piste consignée** : les captures « 390 px » montraient un
  débordement horizontal spectaculaire. Il n'existait pas. Chromium sans tête
  impose une fenêtre minimale de 500 px : les captures étaient des vues à
  500 px recadrées à 390. Mesuré avant de conclure : `scrollWidth == clientWidth`.

## 2026-09-06 — Les sources des studios

`siteUrl` était vide sur les 27 studios. Le niveau de preuve « STUDIO » exige
que l'URL de la source soit sur le domaine de l'éditeur : tant que le domaine
est inconnu, **aucune donnée ne peut l'atteindre**, et tout ce qui est vérifié
chez le studio entre en « RECOUPE » sans qu'aucune erreur ne le signale. Sur un
site dont l'argument est la preuve, c'est la panne la plus coûteuse possible.

Le sens de l'erreur est heureusement conservateur : un domaine faux ne
correspond jamais et rétrograde. Il ne peut pas accorder une preuve imméritée —
d'où InOut Games laissé vide plutôt que deviné.

`ouSourcer` note la méthode, qui diffère à chaque éditeur : « x mise par
ligne » chez Amusnet, euros à 75 € chez Evoplay, diviseur variable de 6 € à
125 € chez Yggdrasil, plafond contractuel chez PG Soft, contributions et non
paliers chez Nolimit. Elle a été payée fiche par fiche.

**Voie d'entrée des rapports de veille** (`src/lib/veille/analyser-rapport.ts`,
26 tests) : refuse un RTP sans URL de source, refuse un gain max en euros
plutôt que de le convertir au jugé, refuse une fiche jumelle d'un jeu déjà au
catalogue, et refuse tout le lot quand un palier dépasse le RTP annoncé — la
signature d'un RTP d'achat de bonus pris pour celui du jeu. L'import n'écrase
jamais : une fiche existante ne reçoit que ce qui lui manque, et un chiffre qui
contredit la base est signalé, pas appliqué.
