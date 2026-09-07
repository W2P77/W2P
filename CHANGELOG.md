# Carnet de bord — where2play

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

## 2026-09-08 — Logos de studios et vitrine sans trous

**« Browse by provider » affiche les logos.** 17 studios sur 27 en ont un ; les
dix autres gardent leur nom, une pastille vide serait pire qu'un mot lisible.
Le nombre de jeux reste sous le logo : un logo se reconnaît plus vite qu'un
mot, mais il ne dit pas combien de titres il y a derrière, et c'est le chiffre
qui fait cliquer.

**Pourquoi « passer les logos en 4K » aurait été contre-productif.** Les
sources vont de 240×62 à 1500×846 px pour un affichage à ~110 px. Agrandir une
source de 240 px vers 4K n'ajoute aucun détail — l'interpolation invente des
pixels, elle ne retrouve pas ceux qui n'ont jamais été capturés — et multiplie
le poids par vingt pour un résultat identique, voire plus flou. Ce qui améliore
réellement la netteté, c'est de servir **trois fois la taille d'affichage** :
tous sont normalisés sur une toile de 400×160 en `contain`, fond transparent.
Les grands y sont réduits, donc plus nets ; les petits y sont posés sans
déformation.

Le script **signale les sept sources plus petites que la toile** (Play'n GO,
PG Soft, BGaming, Playson, Relax, ELK, InOut) : ce sont les seules réellement
en basse définition, et les seules à remplacer par un fichier officiel. Les
traiter en silence reviendrait à croire le problème résolu.

**La vitrine ne montre plus que des jeux avec jaquette.** Deux tiers du
catalogue n'en ont pas, et le repli — nom composé sur fond dégradé — est fait
pour une grille de recherche, pas pour une vitrine. Six cartes de texte sur
huit donnaient l'impression d'un catalogue vide alors qu'il compte 1 951 jeux.
Le filtre coûte de la variété de studios ; il gagne la première impression.

## 2026-09-08 — Calage final : barre 10 px plus bas, conduites à 15 px

La barre descend de 10 px et les trois conduites la suivent pour garder une
marge de 10 px entre la plus basse et le haut de la pilule — à cette distance
le halo du tube commence à toucher la conduite orange, ce qui les relie au lieu
de les juxtaposer.

Le réglage passe par **la hauteur du conteneur**, pas par les décalages
individuels : `ConduiteDecrochee` est ancrée en bas, donc réduire sa hauteur
descend les trois lignes d'un bloc en conservant leur écartement de 7 px. Les
chutes sont réduites d'autant, faute de quoi les paliers bas sortiraient sous
le conteneur — qui n'a pas d'`overflow: hidden`, et les laisserait donc
déborder sur la section suivante sans rien signaler.

## 2026-09-08 — Position finale de la barre de recherche

La barre descend de 8 px de plus et les conduites gardent leur tracé
d'origine : un palier au-dessus de la barre, à une vingtaine de pixels, puis
la descente à 45° à sa droite.

Deux pistes explorées et abandonnées en chemin, gardées ici parce qu'elles
disent ce que la charte n'est pas :

- **Faire passer le palier bas derrière la pilule**, pour que le trait
  traverse l'élément. L'effet est joli sur le papier ; en place, il fait
  remonter tout le faisceau au niveau des boutons et la barre se retrouve
  isolée dans un grand vide.
- **Réduire la descente pour poser le palier juste au-dessus de la barre.**
  Le décrochement devient alors si court qu'il ne se lit plus comme un
  décrochement, seulement comme un décalage.

Le tracé qui fonctionne est le plus simple des trois : le trait longe la barre
de près, et c'est cette proximité — pas l'entrelacement — qui les relie.

## 2026-09-08 — Le cadre du héros disparaît

Le contour cyan qui encadrait l'accroche est supprimé. Il ajoutait une boîte
autour d'un bloc que les conduites suffisent à tenir, et il refermait la
composition là où la référence la laisse ouverte sur l'image.

La barre descend ensuite de 8 px de plus, et la conduite l'accompagne : la
descendre seule aurait creusé l'écart entre le trait et la pilule, et le
décrochement se serait remis à monter trop haut. Les deux se règlent ensemble
ou pas du tout.

Effet de bord utile : le champ de recherche portait une marge négative
(`-ml-2`) dont la seule raison d'être était de **rejoindre le bord gauche de ce
cadre**. Sans lui, la pilule s'aligne simplement sur le titre — ce qui était
l'intention depuis le début, obtenue jusque-là au détour d'un décalage
compensé. La largeur passe de 547 à 499 px, soit la pilule seule, sans la
gouttière qui servait au cadre.

## 2026-09-08 — La conduite se décroche, elle n'est pas doublée

Trois versions pour comprendre la même chose. Le champ de recherche ne doit
porter **aucun trait à lui** : c'est la conduite du bas de l'accroche qui monte
au-dessus de lui, redescend à 45° et reprend son niveau à droite.

- **Version 1** : trois traits — haut, droite, bas — refermés en rectangle. Ça
  se lisait comme une bordure de formulaire, et la conduite continuait tout
  droit en dessous : deux traits là où la référence n'en montre qu'un.
- **Version 2** : une ligne ouverte au-dessus de la pilule. Le rectangle
  disparaissait, mais ça restait un trait **ajouté** — la conduite passait
  toujours en dessous.
- **Version 3** : la conduite elle-même se décroche. Un seul trait, qui
  contourne. `ConduiteDecrochee` remplace `Conduite` au-dessus de 1024 px.

**Pourquoi en segments CSS et non en SVG.** Un SVG étiré en
`preserveAspectRatio="none"` déforme les diagonales : sur une bande de 100 px
de haut pour 1 440 de large, un « 45° » devient un angle de quelques degrés.
Les segments horizontaux s'étirent sans dommage ; les diagonales sont posées à
longueur fixe (`chute × √2`) et gardent leur angle.

Sous 1024 px la barre occupe toute la largeur : plus de place pour le palier
bas, donc le décrochement n'aurait aucun sens. La conduite droite reprend la
main.

Dernier réglage : la barre descend de 12 px et le décrochement perd 10 px de
dénivelé. Une conduite qui monte trop haut frôle les boutons et le détour se
remarque plus que ce qu'il contourne.

## 2026-09-08 — Le décrochement est une ligne, pas un cadre

Le champ de recherche paraissait posé dans une boîte noire. La cause : mes
trois traits — haut, droite, bas — **se refermaient en rectangle**. Un
rectangle autour d'un champ, c'est une bordure de formulaire ; ce n'est pas ce
que fait la référence.

La ligne doit **passer**, pas entourer : elle monte du bord gauche du cadre par
une diagonale à 45°, court au-dessus de la pilule, redescend à droite sur
124 px — le dénivelé exact jusqu'au bord bas — et rejoint la conduite. Rien ne
referme en bas, rien ne referme à droite. La barre pend sous la ligne.

Deux corrections qui vont avec :

- **La ligne est néon, pas grise.** C'est la même conduite que celles qui
  courent sous l'en-tête et au bas de l'accroche. Un trait gris en faisait une
  bordure de champ au lieu d'un détour de la conduite.
- **La diagonale de descente était trop courte** et s'arrêtait en l'air. Une
  ligne coupée redonne au décrochement l'air d'un objet posé — c'est
  exactement ce qu'on cherchait à défaire.

## 2026-09-08 — L'accroche au pixel

Trois allers-retours sur zooms successifs. Ce qui a changé, et ce que chaque
erreur a appris :

**Les boutons sont des hexagones**, coupés aux quatre angles — pas des biseaux
à deux angles (premier essai), pas des pilules (deuxième). À petite échelle un
hexagone allongé ressemble à une pilule : les deux premières lectures venaient
de maquettes vues trop petit. La forme compte au-delà du goût — la pilule
appartient au champ de recherche, seul élément vraiment arrondi de la page, et
la donner aux boutons effaçait ce qui le distingue.

**Les deux boutons sont en contour**, intérieur presque noir, texte blanc sur
les deux. Le magenta plein écrasait le bloc et le second bouton n'existait
plus ; colorer le texte du second le faisait passer pour un lien secondaire.

**Le champ de recherche n'est pas un plateau, c'est un décrochement du cadre.**
Les traits qui l'entourent sont ceux de l'accroche : ils arrivent par le bord
gauche, se coudent à 45°, passent au-dessus de la pilule, redescendent à
droite, et le bas du cadre referme dessous. Un panneau posé ajoute un objet ;
un décrochement dit que la barre appartient au bloc.

**La méthode qui a débloqué les mesures.** Comparer des largeurs entre deux
captures d'échelles inconnues ne donne rien — j'ai obtenu 39 px puis 46 px pour
la même hauteur de pilule selon le zoom utilisé. Mesurer **la même chaîne de
texte** rendue dans la même police (le placeholder) donne le facteur d'échelle
exact, et tout le reste s'en déduit. Résultat : pilule à 499 px de large et
39 px d'intérieur, contre 424 × 46 auparavant.

**Un piège de rendu, pas de style.** Un `input[type=search]` porte une hauteur
intrinsèque que ni `py` ni `leading-tight` ne réduisent : le réglage annonçait
40 px, le navigateur en rendait 50, et la pilule se retrouvait **plus haute que
les boutons** alors qu'elle doit être plus basse. Le rapport correct est 0,87 —
il faut fixer la hauteur, pas la déduire du padding.

**Le visuel repasse en plein cadre.** Le panneau clippé à 62 % donnait une
arête franche et une borne à 24 % de la largeur au lieu de 34 ; le même panneau
avec `scale(1.4)` la sortait du cadre par la droite. En plein cadre,
`object-cover` la pose d'elle-même à 60→99 %, sans transformation.

## 2026-09-08 — Le rendu rejoint la maquette, point par point

Découpage de la maquette sur une largeur utile de 920 px, ramenée à 1440
(× 1,565). Sept écarts mesurés, sept corrigés :

- **Le sur-titre « SLOT CATALOGUE » n'existe pas** sur la maquette. Il ajoutait
  une ligne avant l'argument, au-dessus d'un titre qui dit déjà de quoi il
  s'agit.
- **Les commandes sont arrondies, les contenants biseautés.** Ce n'est pas une
  incohérence, c'est la règle : ce qui se clique est en pilule — boutons, champ
  de recherche ; ce qui contient est coupé à 45° — panneaux, cartes, plateaux.
  Les avoir tous biseautés effaçait la distinction et rendait la page
  uniformément anguleuse, donc plus plate.
- **Le titre occupait 34 % de la largeur contre 52 %** sur la maquette : 62 px
  au lieu de 72.
- **Le sous-titre passait à la ligne**, ce qui poussait les boutons hors du
  premier écran.
- **La pilule de recherche s'aligne sur le titre, pas le plateau** : celui-ci
  la dépasse d'une dizaine de pixels de chaque côté, comme un support.
  Aligner le plateau décalait la pilule de 20 px — un écart que l'œil voit
  sans savoir le nommer.
- **Logo à 70 px** au lieu de 40, plus les quatre points cyan sous le
  mot-marque.
- **Rythme vertical compressé** pour que la première rangée de cartes soit
  visible sans défiler : en-tête de 110 à 85 px, accroche resserrée.

**Le visuel d'accroche.** Il occupe le flanc droit avec une arête diagonale,
pas le cadre entier. En plein cadre, deux choses cassaient à la fois : le rendu
est en 16:9 pour un bloc en 3,5:1, donc la borne perdait sa couronne et son
socle ; et les enseignes du milieu de rue passaient derrière le titre et la
barre de recherche, où elles n'étaient que du bruit. En panneau (~2:1), le
recadrage tombe de 49 % à 11 %.

**Pièges payés :**

- **Le cadre biseauté remplissait tout le héros d'un lavis violet.** La
  technique des deux calques suppose un intérieur **opaque** : le dégradé du
  dessous n'est visible que sur le pixel qui dépasse. Ici l'intérieur devait
  rester transparent pour laisser voir le fond — le dégradé couvrait donc tout.
  Remplacé par six segments tracés : quatre bords droits qui s'arrêtent avant
  les angles, deux diagonales de 23 px (16 × √2).
- **Quatre halos à 15-25 % d'opacité se sont additionnés en un aplat magenta**
  plus lumineux que la borne censée être le sujet. Un néon ne se voit que sur
  du noir : le fond reste sombre à 90 %, la lumière est ponctuelle, jamais
  ambiante.
- **Les fondus de lisibilité sont horizontaux**, donc inopérants sous 1024 px
  où le texte occupe toute la largeur : le sous-titre passait sur la borne
  éclairée. Un voile uniforme, réservé au téléphone, rend le contraste.

Cinq extensions sont acceptées pour le fichier d'accroche. N'en accepter
qu'une aurait produit un fichier déposé au bon endroit, au bon nom, et
toujours invisible.

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
