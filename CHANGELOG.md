# Carnet de bord — where2play

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

## 2026-09-08 — Le tube néon de la barre de recherche

Le contour paraissait flou et la pilule molle. La cause n'était pas la
couleur : c'étaient les deux `drop-shadow` de 8 et 12 px. **À cette distance
la lumière cesse de suivre le contour** — elle se mélange en un bloom violet
et délave le trait qu'elle était censée mettre en valeur.

Trois halos très courts (1, 4, 9 px) et très opaques donnent l'inverse : la
lumière reste collée au trait, le trait reste net. Le rayon compte plus que
l'intensité — 2 px à 0,9 éclaire, 12 px à 0,3 salit. C'est vrai de tous les
néons de la charte, pas seulement de celui-ci.

Deux réglages qui vont avec : le fond de la pilule passe au-dessus de celui du
plateau (#1b2130 contre #0d1220), ce qui la fait paraître encastrée plutôt que
posée ; et un `inset` très faible fait déborder le liseré vers l'intérieur,
comme un vrai tube de verre.

Les proportions, elles, étaient déjà justes — 24 px de marge pour une pilule
de 61 px, soit exactement le ratio de la maquette. Vérifié avant de toucher à
quoi que ce soit, ce qui a évité de corriger ce qui n'était pas cassé.

## 2026-09-08 — Géo, logos, et la langue des faits

**Filtrage par pays.** Les fiches de jeu sont rendues avec `revalidate` : leur
HTML est mutualisé entre tous les visiteurs. Filtrer les casinos au rendu
aurait servi le pays du premier arrivant à tous les suivants pendant une heure,
et fait indexer par Google la sélection d'un pays au hasard. Le serveur rend
donc la liste complète ; un middleware recopie `x-vercel-ip-country` dans un
cookie, et le navigateur réduit la liste au pays de celui qui regarde.

Trois codes ne sont pas des pays mais une absence de réponse : « XX » (IP non
localisable), « T1 » (Tor) et « ZZ » (code CLDR de la région inconnue). Le
dernier est le plus traître — `Intl.DisplayNames` le traduit poliment en
« Unknown Region », et un visiteur aurait lu « Available in Unknown Region ».

On ne descend jamais à zéro : quand aucun partenaire ne couvre le pays, on
montre tout. Une page sans lien perd la visite et laisse croire que le jeu est
introuvable, alors qu'il est seulement hors de notre sélection là-bas. Et on
n'écrit jamais qu'un opérateur refuse un pays : `pays` décrit **notre**
couverture, pas sa politique.

**Logos.** Les 44 casinos portaient un chemin de logo, et **aucun des 44
fichiers n'existait**. Le composant testait `if (c.logo)` : le chemin étant
renseigné, il rendait une `<img>` cassée — exactement le cas que le repli
devait couvrir. Un champ rempli qui ment est plus coûteux qu'un champ vide.

**La langue des faits.** Les offres et les mécaniques venaient de BetsRank, en
français, sur des fiches entièrement anglaises. 44 offres traduites (avec
vérification mécanique qu'aucun montant ne bouge — une offre annoncée à
15 000 € au lieu de 1 500 € est une promesse fausse faite au nom d'un
partenaire) et 3 594 chaînes de faits.

**Pièges payés :**

- **`\b` ne marque pas de frontière après une lettre accentuée** en regex JS
  sans le drapeau `u`. `/difficult[ée]\b/` ne correspond jamais au singulier :
  le motif paraît juste, ne lève rien, et ne remplace rien. Ça a coûté
  « jusqu'à », « difficulté » et « extensible à » — trois fois la même erreur
  avant d'être nommée.
- **Une traduction partielle est pire que pas de traduction.** Le premier
  détecteur listait des mots français à rejeter ; il a laissé passer 464
  chaînes du genre « expanding à 5x5 » et « Multipliers cumulés ». Une phrase
  à moitié traduite a l'air d'avoir été relue. Le détecteur rejette désormais
  **tout accent**, ce qui attrape d'un coup la famille de mots qu'une liste
  manuelle oubliait un par un.
- **L'ordre des règles est le fond du sujet** : « extensible à » doit être
  consommé avant « extensible », sinon il reste un « à » orphelin greffé sur
  un mot déjà traduit.
- **Le `Decimal` de Prisma, deuxième fois.** Passer `OuJouer` côté client a
  fait traverser `note` — un `Decimal` jamais affiché, sélectionné pour rien.
  Le typage ne pouvait pas le voir : le champ était déclaré `unknown`.

**Reste à faire, mesuré :** 1 580 formes portent encore du français (rapport
via `scripts/lister-restes-francais.ts`). Ce ne sont plus des termes mais des
phrases rédigées — chaque règle supplémentaire y gagne trois chaînes et
augmente le risque d'en abîmer d'autres. Ça se traduit à la main, ou pas.

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
