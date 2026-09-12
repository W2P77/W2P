# Carnet de bord — where2spin

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

## 2026-09-12 — Onze doublons fusionnés puis supprimés

Les onze paires que `resoudre-doublons.ts` refusait de supprimer sont
résolues : leur contenu était **réparti entre les deux fiches**, et parfois
contradictoire. `scripts/fusionner-doublons.ts` le rassemble avant que l'autre
script ne supprime.

**La règle d'arbitrage tient en trois lignes.** Une valeur prouvée gagne
toujours — la table `Preuve` enregistre ce qui a été lu dans le panneau du jeu.
Sinon une valeur présente bat une valeur absente. Sinon, deux valeurs
différentes dont aucune n'est prouvée : on ne touche à rien et on signale.

Deux corrections dans le sens « la fiche gardée avait tort » : `the-dog-house`
passe de volatilité HAUTE à MOYENNE, prouvée par le panneau. Et deux dans
l'autre : `vikings` garde 5 600x et non 10 000x, `san-quentin-2-death-row`
garde 96,13 %.

**Deux garde-fous que les données ont imposés, et qui n'étaient pas prévus.**

· `rtpSource`, `rtpConfiance` et `rtpVerifieLe` **ne voyagent qu'avec le
  `rtpStudio` qu'ils attestent**. Les recopier sur une fiche affichant un autre
  taux déclarerait sourcé un chiffre que la source ne dit pas.

· **Les captures sont adossées au RTP elles aussi.** Leurs légendes portent le
  chiffre en toutes lettres — « Stated by the game itself: RTP 96.47% ». Les
  déplacer vers une fiche qui annonce 96,50 publierait la contradiction à
  l'écran, en image, sous le label le plus fort du site.

**Le blocage final tenait à un seul chiffre.** `fruit-party` affichait 96,50
sans aucune source ; son doublon portait 96,47 lu dans le panneau, confiance
STUDIO, capture à l'appui. Le panneau fait autorité : la fiche gardée est
alignée, et les onze paires deviennent fusionnables.

Restent quatre contradictions non tranchées sur `mustang-gold` et
`the-dog-house` — gain max 12 000 contre 10 000, deux listes de mécaniques, une
date. Aucune n'a de preuve : deux relectures de panneau les régleront.

## 2026-09-12 — Dix doublons supprimés, onze refusés, et un jeu sauvé

`scripts/resoudre-doublons.ts` sépare trois questions qu'on confondait :
**est-ce le même jeu**, **laquelle garder**, et **la gardée perd-elle quelque
chose**. La troisième est celle qui protège : toute perte de champ, de preuve
ou de traduction vaut refus.

Détection par quatre signaux croisés sur 11 679 fiches — identifiant du
lanceur, nom normalisé, slug sans suffixe d'import (`-slot`, `-netent`, `-btg`),
variante chiffrée. **102 amas**, dont neuf écartés comme défauts de données :
un signal qui réunit plus de trois fiches désigne une série, pas un doublon
(`cygnus-2/3/6`, `fire-hot-20/40/100`).

**Dix suppressions sans perte** — `wolf-gold-slot`, `sweet-bonanza-slot`,
`the-dog-house-megaways-slot`, `luxor-of-cleopatra-2`… Chaque arbitrage est
prouvé pièce par pièce : page produit du studio d'abord, puis captures, preuves
et traductions.

**Onze refus qui valent plus que les dix suppressions.** Le motif est
systématique : le studio reconnaît un slug, mais c'est **l'autre** qui porte le
RTP, les captures et les preuves. `cursed-crypt-hacksaw` a neuf captures, deux
preuves et un RTP sourcé ; `cursed-crypt` est vide mais c'est le slug officiel.
Recopier le contenu vers la fiche officielle avant de supprimer, c'est onze
doublons résolus **et** onze fiches enrichies.

**Le piège évité.** `pirate-gold-slot` et `pirates-riches-slot-23-may-2019`
partagent `gameSymbol=vs40pirate` — mais Pragmatic publie **deux pages produit
distinctes**. Ce sont deux jeux, et l'un portait la démo de l'autre. La
première version du script proposait de supprimer « Pirate's Riches », un jeu
réel. C'est exactement ce que CLAUDE.md met en garde : deux slugs qui se
ressemblent ne sont pas forcément le même jeu. Sa `demoUrl` est vidée plutôt
que de laisser un bouton ouvrir le mauvais titre.

**À prévoir avant d'aller plus loin** : aucune redirection n'existe côté site,
donc chaque slug supprimé devient un 404. Les dix d'aujourd'hui étaient vides
et jamais proposés à l'indexation, mais `the-dog-house` et `fruit-party` — dans
les refus — ont du contenu.

## 2026-09-12 — Wazdan, Nolimit City et Push Gaming : 480 démos

Trois studios entièrement invisibles — 498 fiches, 224 démos entre elles.
**480 adresses écrites** : Wazdan 261 sur 262, Push Gaming 82 sur 85, Nolimit
City 137 sur 151. Aucun des trois n'était à abandonner.

**Chacun se lit autrement, et c'est tout l'intérêt de la reconnaissance.**

· **Wazdan publie son propre catalogue** (`wazdan.com/gamesapi`, 1 200 entrées
  dont 265 jeux), chacun avec un `gameDemo` **déjà construit par le studio**.
  Une requête au lieu de 262, et surtout aucune URL fabriquée par nous. Piège
  du second recours : la fiche produit assigne `gameParams` à
  `{"game_url":null}` avant de le réassigner — c'est la seconde affectation qui
  compte.

· **Nolimit City tourne sur la plateforme de Red Tiger et NetEnt** : `tableId`
  dans le `__NEXT_DATA__`, démo en `/demo/{tableId}`. Et `/demo/CeJeuNexistePas`
  y répond **200 à sept octets près** — ceux du tableId recopié. Le garde-fou
  s'appliquait mot pour mot.

· **Push Gaming ne met aucune démo sur sa fiche produit** : ni iframe, ni
  bouton, ni le mot « demo ». L'adresse ne vit que dans le `data-url` du bouton
  de la liste `/games/`. La page qu'elle ouvre pose une iframe dont le `src`
  est un base64 — mais l'URL décodée porte un **token à usage unique qui répond
  403 rejoué**. C'est donc la page enveloppe qu'on retient, pas le lanceur.

**Deux doublons refusés par le garde-fou des lanceurs** :
`san-quentin-2-death-row` rendait le même que `san-quentin-2`, et
`xways-hoarder-2` le même que `x-ways-hoarder-2`. Sans lui, quatre fiches
auraient publié deux paires de captures identiques sous quatre URLs indexables.

**Les trois lanceurs sont embarquables** — aucun `x-frame-options`, aucun
`frame-ancestors`. De quoi jouer sur la fiche, une fois les captures faites.

**Ce qui reste, nommément.** Huit noms tronqués en base chez Nolimit City
(`san-quentin` pour « San Quentin xWays® », `mental-2` pour « Mental II »…) :
les corriger débloque huit fiches d'un coup. Quatre démos annoncées à une date
future repasseront seules. Et `game-1` annonce « Fire In The Hole 4 » — le
piège Victorious MAX, à ne pas écrire.

## 2026-09-12 — Trois fiches en double supprimées, et la boucle qui les recréait

Les trois paires suspectes sont tranchées, et le verdict n'était pas celui
qu'on croyait : **elles portent le même `gameSymbol`**. `vs25dwarves_new` pour
les deux « Dwarven Gold », `vs10floatdrg` pour les deux « Floating Dragon »,
`vs5jokjewhs` pour les deux « Joker's Jewels ». Chez Pragmatic c'est **un seul
jeu** — les captures n'étaient donc pas fausses, seulement dupliquées.

Le titre de la page produit dit lequel est le bon : Pragmatic publie « Dwarven
Gold Deluxe », « Floating Dragon Hold and Spin », et `jokers-jewels-hold-spin`
(l'autre slug est en 404 chez eux). Les trois fiches mal nommées sont
supprimées — elles créaient une seconde page indexable pour un seul jeu.

Vérification avant suppression : `jokers-jewels-hold-and-spin` portait trois
preuves, mais la fiche gardée porte **les mêmes valeurs** (10 000x, 96,52 %,
volatilité moyenne). Rien n'a été perdu.

**Et la boucle.** Vider les `demoUrl` en double ne suffisait pas : le script
Pragmatic déduit la page produit du slug, donc `wolf-gold-slot` rendait le même
lanceur que `wolf-gold` et le doublon renaissait au passage suivant. Le script
refuse désormais d'écrire un lanceur déjà pris par une autre fiche, et le
rapporte comme « doublon de catalogue » plutôt que de l'écrire en silence.

Six paires restent dans cet état — `the-dog-house`, `fruit-party`,
`wild-west-gold`… Leur `demoUrl` est vidée côté doublon, mais les deux fiches
existent toujours. Elles se traiteront comme ces trois-là : titre officiel
d'abord, suppression ensuite.

## 2026-09-12 — NetEnt et Evoplay débloqués, et 24 démos qui mentaient

**311 démos trouvées** : NetEnt 221 sur 237 (93 %), Evoplay 90 sur 269. Les
deux studios n'en avaient respectivement que 24 et 6.

NetEnt tourne sur la plateforme de Red Tiger — même `tableId`, même route
`/demo/<tableId>`. La forme `www.netent.com/en/game/<slug>/`, présente sur
quatre lignes en base, **est morte** : 404 y compris pour Starburst. Evoplay ne
publie rien sur ses fiches et renvoie vers son portail `player.city` ; deux
voies y mènent et il faut les deux, le sitemap du portail rattrapant les jeux
qu'Evoplay oublie de lier depuis sa propre fiche. Son plafond est structurel :
101 pages de jeu pour 269 fiches, **90 trouvées sur ~94 atteignables**.

**Le garde-fou du nom a payé immédiatement.** `netent.com/games/victorious/`
annonce aujourd'hui « Victorious MAX™ » — un autre jeu — tout en gardant le
`tableId` de l'ancien. Sans confrontation du nom, on écrivait une démo qui
ouvre le mauvais jeu.

**24 `demoUrl` qui menaient ailleurs qu'au jeu annoncé.** En cherchant les
doublons, onze groupes de fiches partageaient une même adresse :

· **14 jeux Hacksaw** pointaient vers `hacksawgaming.com/games` — la **liste**
  des jeux, pas un jeu. Quatorze boutons « démo » qui ouvraient un catalogue.

· **Dix paires** partageaient un lanceur. Certaines sont de vrais doublons de
  slug (`the-dog-house` / `the-dog-house-slot`), mais d'autres portent des noms
  **différents** — « Big Catch Game » et « Treasures of The Gods », « Dwarven
  Gold Deluxe » et « Dwarven Gold » : là, l'une des deux ouvrait le jeu de
  l'autre.

Dans chaque paire, la fiche gardée est celle qui a des captures : ses images
prouvent que la démo ouvrait bien ce jeu-là. L'autre voit sa `demoUrl` vidée.

⚠️ **Reste à trancher** : `dwarven-gold-deluxe-slot` et `dwarven-gold-slot` ont
**chacune huit captures prises avec la même URL** — l'une porte donc les images
de l'autre. Vider l'adresse arrête le mensonge du bouton, pas celui des images.
Même question pour `floating-dragon` / `floating-dragon-hold-and-spin` et les
deux `jokers-jewels`.

## 2026-09-12 — Les dates de sortie ne sont pas publiées, et on n'en invente pas

227 fiches visibles n'ont aucune `sortieLe` — **164 chez Pragmatic, 63 chez
Hacksaw**, zéro ailleurs. Toutes nos dates viennent de l'import initial, et ce
sont justement les deux studios qu'il ne couvrait pas. Chez Hacksaw, six fiches
visibles sur dix sont donc absentes de « Dernières sorties ».

**Ni l'un ni l'autre ne publie la date.** Les pages produit donnent le RTP, les
fonctionnalités, la table de gains — jamais la date de mise en ligne. Quatre
substituts ont été testés, chacun **confronté aux dates que nous possédons
déjà**, seul contrôle qui vaille :

| substitut | écart mesuré |
|---|---|
| `datePublished` du JSON-LD Pragmatic | −51 à +109 jours |
| communiqués de presse Pragmatic | médiane **+121 jours**, 5 bons sur 41 |
| `Last-Modified` des vignettes Hacksaw | médiane **−61 jours**, 1 bon sur 24 |
| `lastmod` du sitemap Hacksaw | figé à 2022-03-01 |

Deux à quatre mois d'erreur : exactement de quoi faire passer un jeu de mai
pour un jeu de mars dans un bloc qui vend la fraîcheur. **Rien n'est écrit.**

Le script existe quand même (`scripts/completer-dates-sortie.ts`) : il n'accepte
qu'un `releaseDate` de JSON-LD ou une étiquette explicite suivie d'une date au
jour près, refuse une année seule plutôt que d'inventer un 1ᵉʳ janvier — le
projet a déjà été mordu par des centaines de fiches datées ainsi — et son
en-tête consigne les quatre substituts **avec leurs écarts**, pour que personne
ne refasse le tour. En simulation : 0 date retenue sur 227, 9 refus pour
imprécision, 1 slug décalé (`jokers-jewels-hold-and-spin` contre
`jokers-jewels-hold-spin` chez Pragmatic).

**La vraie voie est commerciale** : demander aux deux studios un tableur
« titre / date de mise en ligne ». C'est une demande banale pour un affilié,
elle règle les 227 d'un coup et elle est attestable. Pour les jeux à venir,
`detecter-nouveautes.ts` fait déjà le travail au bon moment.

## 2026-09-12 — Red Tiger : 348 démos retrouvées

355 jeux en base, **26 avec une `demoUrl`**. Sans démo, pas de capture ; sans
capture, pas de fiche publiable — le studio entier était hors d'atteinte.

**Le piège que la reconnaissance a évité.** La fiche produit Red Tiger ne porte
ni iframe ni lien : le bouton « Demo » pousse une route côté client,
`/demo/<tableId>`, et le `tableId` n'est lisible que dans le `__NEXT_DATA__` de
la page. Surtout : **`redtiger.com/demo/<n'importe quoi>` répond 200**, à
l'octet près, même avec un identifiant inventé. La route est une coquille SSG.
Un code HTTP ne prouve donc rien ici, et vérifier une URL construite aurait
validé n'importe quoi. Le script ne fabrique jamais une adresse sans avoir lu
le `tableId` dans la page du jeu.

**Deux garde-fous qui ont servi.** Le nom lu dans la page est confronté à celui
de la base : un slug qui mènerait à un autre jeu est un échec, pas une écriture
silencieuse. Et Red Tiger publie ses fiches **avant** d'ouvrir les démos — six
jeux annoncent une date future (Stormfire le 23/09, Santa's Rage le 25/11).
Écrire leur URL donnerait un bouton répondant « Demo is not available yet » :
ils sont laissés de côté et retomberont d'eux-mêmes au prochain passage.

**348 URLs écrites sur 355.** Reste un écart de nom non tranché — la page de
`pirates-plenty-the-sunken-treasure` annonce « Pirates Plenty ». C'est
vraisemblablement le même jeu au titre raccourci, mais contourner le garde-fou
pour une fiche ne vaut pas le risque de lier la mauvaise.

Le studio attend maintenant son adaptateur de capture.

## 2026-09-12 — L'adaptateur Play'n GO était écrit, jamais branché

369 lignes, documentées jusqu'au détail de la surcouche « ? » à capturer en
premier — et **absent de la table `ADAPTATEURS`**. Son propre en-tête l'avait
prévu : « le branchement s'y fait en une ligne, quand ce fichier est prêt ».
Il l'était. La ligne manquait.

Conséquence : les **180 fiches Play'n GO** qui ont une démo et pas de capture
étaient hors d'atteinte du pipeline. Elles ont un RTP, il ne leur manquait que
les images — donc la seule chose qui les séparait de la publication était une
entrée dans un objet.

Vérifié à blanc avant de lancer : deux jeux sur trois capturés, le troisième
sur une URL de démo qui ne résout plus. Le « RTP non lu » n'est pas un échec
mais le comportement documenté de cet adaptateur — Play'n GO ne publie aucun
pourcentage dans ses démos, et ces fiches tiennent déjà le leur d'ailleurs.

**Ce que cet épisode dit du catalogue.** 5 057 fiches ont un RTP sans capture,
et seules 211 étaient capturables : le facteur limitant n'est pas le nombre de
jeux mais le nombre d'adaptateurs. Chacun en débloque plusieurs centaines —
Red Tiger 354, Wazdan 260, NetEnt 234, Evoplay 207. Sauf que ces studios-là
n'ont presque aucune `demoUrl` en base (4 à 26 sur des centaines) : il faudra
les trouver avant de pouvoir capturer quoi que ce soit.

## 2026-09-12 — La carte de partage porte enfin la marque

Deux défauts, tous deux visibles au premier coup d'œil sur un lien partagé.

**La police n'était celle de personne.** Satori n'a pas de CSS : il ne peut pas
se servir de `next/font`, et sans police fournie il compose dans sa fonte par
défaut. La carte sortait donc dans un caractère qui n'existe nulle part sur le
site. Saira Condensed — celle des titres — est déposée dans `public/fonts/` et
téléchargée par la carte, comme la jaquette : `public/` n'existe pas sur le
disque d'une fonction serverless.

**La signature était un mot gris.** Le logo la remplace. Il est rendu à 230 px
de large, pas 150 : à la taille d'une mention discrète il n'était plus qu'une
tache, et une signature illisible signe moins bien qu'un mot lisible. Le ratio
d'origine est conservé pour ne pas l'écraser, et la composition a été
rééquilibrée — jaquette ramenée à 640 px, marge verticale ajoutée, puisque les
plateformes recadrent et qu'on ne colle rien au bord.

Le repli tient dans les deux cas : sans police, la carte se compose quand même ;
sans logo, le mot revient. Vérifié sur une fiche avec jaquette et une sans.

## 2026-09-12 — Les titres les plus cherchés n'avaient pas de démo

La vitrine mettait en avant neuf titres écrits à la main — Sweet Bonanza,
Sugar Rush, Big Bass Bonanza, Wolf Gold — dont **un seul** avait une fiche
complète. En cherchant pourquoi, on trouve la cause plus bas que prévu :
**105 jeux Pragmatic n'avaient aucune `demoUrl`**, et ces sept-là en faisaient
partie.

L'enchaînement se tenait tout seul : pas de démo → le pipeline de captures ne
peut pas les prendre → pas de capture → la fiche n'est pas publiable. Les
titres que les gens cherchent par leur nom étaient les seuls à manquer.

`extraire-demos-pragmatic.ts` ne traitait que les fiches ayant déjà une page
produit en `demoUrl`. Il couvre maintenant aussi celles à `null`, dont la page
produit se déduit du slug. **101 URLs écrites**, 619 → 699 jeux Pragmatic avec
une démo jouable.

Puis captures : **5 vedettes publiées** — Sweet Bonanza 1000 (96,53 %), Sugar
Rush (96,50 %), Big Bass Bonanza (96,71 %), Gates of Olympus 1000 (96,50 %) et
Wolf Gold. Le catalogue passe de 769 à 774 fiches visibles.

**Deux résistent** : Madame Destiny Megaways et Starlight Princess, « icône des
règles introuvable », de façon reproductible — ce n'est donc pas un aléa de
chargement mais un cas que l'adaptateur ne sait pas traiter. À diagnostiquer.

**Un écart signalé, pas écrasé** : Wolf Gold porte 96,01 en base, le panneau
affiche 96. Ses captures sont publiées, son RTP non — le panneau fait autorité
mais un écart veut presque toujours dire autre chose, et l'écraser en silence
effacerait l'indice.

**Au passage**, le script exécutait sa campagne complète dès qu'on l'importait :
`lireDemo` est exportée, et l'importer pour tester sept jeux déclenchait 724
requêtes en arrière-plan. Une garde d'exécution a été ajoutée.

## 2026-09-12 — Les fiches non finies sortent de la navigation

Le seuil de publication ne posait qu'un `noindex` : Google ne voyait plus les
fiches incomplètes, mais le catalogue, la recherche, les démos, les nouveautés
et les pages de studio continuaient de les proposer. Une fiche sans image
restait à un clic, et les compteurs annonçaient 11 682 jeux pour un catalogue
qui n'en montrait que 769 d'ouvrables.

Toutes les listes appliquent maintenant le même filtre, et **les compteurs
aussi** : la home annonce 769 jeux, une page de studio son nombre réel de
fiches ouvrables, et un studio dont aucune fiche n'est finie disparaît de la
grille plutôt que d'y figurer à zéro.

**Ce que « pas visible » ne veut pas dire.** L'URL continue de répondre. Un
lien déjà partagé, un favori enregistré, un résultat encore dans Google mènent
à une page qui s'affiche — en `noindex`. On retire ce qu'on met en avant, on ne
casse pas ce qui existe.

**Deux détails d'implémentation qui comptent.** Prisma ne sait pas filtrer sur
la longueur d'un tableau `jsonb` : la liste des slugs visibles est calculée en
SQL puis passée en `slug: { in: … }`. Et la mémoïsation est maison plutôt que
le `cache()` de React — ce dernier n'existe qu'en contexte serveur et rendait
le module impossible à charger dans un test. Elle dure dix secondes, assez pour
dédupliquer les trois requêtes d'un même rendu, assez peu pour qu'une fiche
fraîchement capturée apparaisse sans redéploiement. Une requête ratée n'est pas
mise en cache : sans ça, une coupure d'une seconde viderait le catalogue pour
dix.

## 2026-09-12 — Les cartes de partage ne montraient jamais le jeu

Partager une fiche donnait une carte en texte seul : le nom, le RTP, le
mot-marque, et un grand fond noir là où le jeu aurait dû être. Sur **toutes**
les fiches, depuis toujours.

**La cause.** Satori — le moteur derrière `ImageResponse` — ne décode que le
PNG, le JPEG et le SVG. **Il ne lit pas le WebP.** Et il ne le signale pas :
pas d'erreur, pas d'avertissement, juste une image absente. Nos 1 855 jaquettes
étant toutes en `.webp`, aucune n'a jamais atteint une carte de partage.

Le code avait pourtant l'air correct — il lisait le fichier, l'encodait en
base64, le passait en `src`. Il n'y avait rien à déboguer : il fallait savoir
ce que Satori sait lire. C'est le genre de panne qu'aucun test unitaire
n'attrape et qu'on ne voit qu'en regardant l'image produite.

**Le remède.** La jaquette est convertie en PNG à la volée avec `sharp`,
ajouté aux dépendances. La conversion est faite ici et pas en amont parce que
le `.webp` reste le bon format pour le site : c'est l'OG qui a une contrainte
particulière, pas le catalogue.

Une conversion qui échoue retombe sur le mot-marque seul, le repli déjà prévu.
Vérifié sur quatre fiches : Pragmatic, Hacksaw et BGaming montrent leur
jaquette (430 à 600 Ko), et une fiche sans artwork rend toujours sa carte
sobre (109 Ko).

## 2026-09-12 — Le badge de preuve disparaît, le fait reste

Quatre niveaux de preuve, une pastille sur chaque jaquette, un filtre dédié et
un tri « mieux sourcé ». Sur les 769 fiches désormais publiables, **90,4 %
portent le même badge** et `RECOUPE` n'en concerne que **9**. Un badge que neuf
pages sur dix affichent ne distingue plus rien : il décore.

**Ce qui le remplace existait déjà.** Le texte d'analyse dit la provenance en
toutes lettres — « Le chiffre vient de pragmaticplay.com, et la page est liée
plus haut » — ou l'absence de confirmation, tout aussi franchement. Une phrase
est plus claire qu'une pastille de trois lettres, et elle nomme la source au
lieu de la classer.

Retiré : `BadgePreuve` (carte, fiche, guides), le filtre « niveau de preuve »,
le tri « mieux sourcé », et les 12 clés i18n devenues orphelines dans les trois
langues.

**Le tri par défaut du catalogue ne bouge pas.** Il classe toujours les mieux
sourcées d'abord — c'est un bon ordre par défaut. Il n'est simplement plus
proposé comme un choix à faire au visiteur, parce que ce n'en était pas un.

## 2026-09-12 — La vitrine dit enfin ce qu'elle montre

La section d'accueil s'appelait « les mieux notées cette semaine » et affichait
une **liste de neuf slugs écrite à la main**. Ni notées — on ne note pas les
jeux et aucun champ ne le permettrait — ni de cette semaine : Gates of Olympus
est sorti en 2021.

Elle affiche maintenant les **dernières sorties**, triées par date, parmi les
seules fiches publiables. Un titre par studio d'abord, pour qu'un studio qui
publie cinq jeux le même mois n'occupe pas la rangée entière ; le reste
complète si la variété ne suffit pas.

**Pourquoi « dernières sorties » et pas « de la semaine ».** Parce que ce
serait faux la plupart du temps : **9 992 fiches sur 11 682 n'ont aucune date
de sortie**, et le catalogue n'en a enregistré qu'**une en août**, zéro en
septembre. Un libellé promet quelque chose ; celui-là ne promet que ce qu'on
tient.

**Ce que la liste écrite cachait.** Sur ses neuf titres, **un seul** avait une
fiche complète (Gates of Olympus). Sweet Bonanza, Sugar Rush, Big Bass Bonanza,
Book of Dead n'ont aucune capture : la vitrine mettait en avant des pages que
le site lui-même ne propose pas aux moteurs. Les capturer reste le travail le
plus rentable — ce sont les titres que les gens cherchent par leur nom.

À traiter séparément : 85 % du catalogue sans date de sortie, et une seule
nouveauté détectée en août. `scripts/detecter-nouveautes.ts` existe ; il n'a
manifestement pas tourné depuis un moment.

## 2026-09-12 — On ne publie plus que les fiches finies

Le seuil de publication était « un RTP présent ». Il laissait passer **5 831**
pages, dont **3 901 sans la moindre image** — ni jaquette ni capture. Une fiche
qui annonce un taux sans rien montrer du jeu n'est pas une fiche, et les
publier par milliers dessert précisément les quelques centaines qui sont
complètes.

Le seuil exige désormais **une capture**. Il reste **769 pages**.

**Pourquoi une seule condition suffit.** La capture entraîne tout le reste : le
pipeline ouvre la démo officielle, lit le panneau de règles et en ramène du
même coup le RTP, la volatilité, le plafond et les mécaniques. Entre « au moins
une capture » et « capture + volatilité + plafond + mécaniques + démo », il n'y
a que **29 fiches** d'écart. Cinq conditions n'ajouteraient que de la
complexité. Et ce seuil-là ne se pose pas à la main : une fiche devient
publiable le jour où le pipeline la capture, sans que personne y repasse.

**Ce que « non publiable » ne veut pas dire.** La page reste consultable et le
catalogue continue de la lister : on ne cache pas un jeu au public, on
s'abstient de le proposer aux moteurs tant qu'il n'a rien à leur montrer.
C'est `noindex, follow` — les liens gardent leur valeur.

**Le sitemap ne suivait plus.** Son propre commentaire prévenait que les deux
critères devaient rester d'accord, « sinon le sitemap promet une page que son
`robots` refuse » — c'est exactement ce qui arrivait. Il applique maintenant la
même règle, en SQL : Prisma ne sait pas filtrer sur la longueur d'un tableau
`jsonb`, et `captures: { not: null }` laisserait passer un tableau vide, qui est
précisément le cas à exclure.

**La vitrine de l'accueil suit la même règle.** Une carte d'accueil est une
promesse : mettre en avant un jeu dont la page n'est pas proposée aux moteurs,
c'est envoyer le visiteur sur la seule page qu'on juge nous-mêmes incomplète.

⚠️ **Effet de bord à traiter** : sur les 9 vedettes écrites à la main, **une
seule passe le filtre** (Gates of Olympus). Sweet Bonanza, Sugar Rush, Big Bass
Bonanza, Book of Dead et les autres n'ont aucune capture — ce sont pourtant les
titres qui font cliquer. Les capturer est prioritaire.

## 2026-09-12 — Premier postback réel : le préfixe survit, l'IP trahit

**Le bon côté.** Un REG BonRush a fait l'aller-retour complet : clic →
`sub1=w2p-…` → AlfaLeads → BCE → conversion. Le clickId est revenu **avec son
préfixe intact**. Aucun système de rattrapage n'est nécessaire pour retrouver
un clic where2spin depuis un postback.

**Le mauvais.** La conversion a été attribuée à l'affilié **AFF7**. Le clic
where2spin ne porte pas d'`affiliateId`, donc l'attribution est retombée sur
son repli : `getAffiliateByIp` a rendu AFF7, dont l'IP du visiteur portait
l'association depuis un clic BetsRank antérieur.

Ce repli ne s'était jamais déclenché parce que les clics where2spin n'avaient
pas d'IP — **c'est l'ajout de l'IP, une heure plus tôt, qui l'a rendu
possible.** Une correction qui en ouvre une autre.

**Le remède tient dans un nom.** Le postback ne lève `ipIsVisitor` que s'il
trouve un champ `ip` sur le clic. L'IP est donc écrite sous `ipVisiteur` : la
donnée reste disponible pour la géo et l'antifraude côté where2spin, et la
chaîne d'attribution de BetsRank ne la voit pas. Rien à modifier sur BCE, dont
le déploiement est figé de toute façon.

Le fond du problème est que **where2spin n'a pas d'affiliés** : toute
attribution par IP y est nécessairement fausse, jamais approximative. Un test
interdit désormais de remettre l'IP dans le champ `ip` en croyant compléter la
fiche.

## 2026-09-12 — Le clic sait enfin d'où vient le visiteur

La notification where2spin affichait trois champs là où celle de BetsRank en
donne dix. Mais le manque n'était pas cosmétique : `ip`, `userAgent`,
`country` et `referer` partaient à `null` **dans Redis aussi**. Quatre champs
que `ClickLog` prévoit et que BetsRank remplit — sans eux, pas de géo, pas de
déduplication, aucun score d'antifraude possible sur les clics where2spin.

`src/lib/tracking/visiteur.ts` lit la requête une fois et sert les deux
chemins.

**L'IP est celle du visiteur, et on peut l'affirmer.** Une IP prise au mauvais
endroit est celle d'un intermédiaire, et tout code qui attribue dessus crédite
n'importe qui. On lit donc `x-vercel-forwarded-for`, posé par l'edge et non
falsifiable par le client ; `x-forwarded-for` ne sert qu'en repli, et on en
prend la **première** adresse — la seule qui soit celle du client. Le drapeau
`estFiable` dit laquelle a servi, et la notification affiche « non vérifiée »
plutôt que de taire l'IP ou de lui donner le crédit d'une donnée sûre.

**`source` et `site` ne disent pas la même chose.** `source` porte le canal
(`web` / `discord`, comme chez BetsRank), `site` porte le site (`w2p`). Les
confondre afficherait « Source URL : where2spin » dans le dashboard, à la
place de l'information que la colonne existe pour porter. La détection Discord
reprend le test de BetsRank : user-agent de l'application, ou referer
`discord.com`.

Enfin, `XX` — le code que Vercel envoie quand il ignore le pays — est traité
comme une absence. L'afficher comme un pays serait inventer une donnée.

## 2026-09-12 — Les clics arrivent enfin dans Redis

Le projet Vercel `w2-p` n'avait que **deux** variables en production :
`DATABASE_URL` et `DISCORD_WEBHOOK_CLICS`. Aucune variable Upstash. `redis`
valait donc `null` et `enregistrerClic` renonçait avant même d'essayer — après
la correction du `lpush`, c'était la seconde cause du même symptôme.

`UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` posées en production
(Sensitive), redéploiement, puis clic réel vérifié de bout en bout :

    avant : 51 clics · 1 where2spin
    apres : 52 clics · 2 where2spin
       megafishwins  w2p-ef9af8cb-b53d-41d2-a407-8695e4e51e34

**Ce que cette panne apprend sur le diagnostic.** Deux causes différentes ont
produit exactement le même symptôme, et aucune ne se voyait dans le code : la
seconde s'est révélée en comparant **deux origines d'exécution** — le même
appel écrivait depuis le poste et pas depuis la production. Relire le code
n'aurait jamais donné la réponse ; il était correct.

Ce qui n'est **pas** sur Vercel, et n'a pas à y être : `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` ne servent qu'à téléverser une capture depuis un
script (`src/lib/visuels/stockage.ts`). Le site n'en a pas besoin au runtime,
les captures étant servies par URL publique.

## 2026-09-12 — Un clic perdu le dit maintenant dans les logs

Entrée écrite après coup pour le commit `b14bfd6`, poussé sans elle — la règle
du carnet est une entrée dans le **même** commit.

L'appelant enveloppe `enregistrerClic` dans un `.catch(() => {})` : un incident
de journalisation ne doit jamais retenir un visiteur en partance chez un
partenaire. Mais « ne pas bloquer » n'est pas « ne rien dire ». Le `lpush` sur
une clé du mauvais type a échoué pendant toute la mise en place sans laisser la
moindre trace, et la panne n'a été trouvée qu'en lisant Redis à la main.

Chaque abandon écrit donc une ligne dans les logs Vercel, avec sa raison :
variables Upstash absentes, lecture impossible, écriture impossible.

**Ce que ça a immédiatement révélé.** Un clic réel déclenché sur la production
partait bien sur Discord mais n'arrivait pas dans Redis, alors que le même
appel depuis le poste l'écrivait sans problème. La différence tient aux
variables : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont dans le
`.env.local` et **absentes du projet Vercel where2spin**. `redis` y vaut donc
`null`, et la fonction renonçait avant même d'essayer.

À retenir pour les deux sites : la notification Discord et l'enregistrement du
clic empruntent deux chemins indépendants. Voir l'une arriver ne prouve rien
sur l'autre — c'est exactement ce qui a masqué la panne.

## 2026-09-12 — Aucun clic where2spin n'était enregistré

Le dashboard BetsRank n'affichait aucun clic portant un clickId `w2p-`. Ce
n'était pas un défaut d'affichage : **il n'y avait rien à afficher.** La clé du
jour contenait 50 clics, zéro venant de where2spin.

**La cause.** `enregistrerClic` faisait un `lpush` sur `bce:clicks:<jour>` en
supposant une liste Redis. La clé est une **string** : BetsRank y stocke le
tableau JSON entier, lu par `get` et réécrit par `set`
(`app/api/go/logger.ts`). Chaque écriture renvoyait donc `WRONGTYPE`, et
l'appelant l'avalait — `enregistrerClic(...).catch(() => {})`, écrit
volontairement pour qu'un incident de journalisation ne retienne jamais le
visiteur. La notification Discord, elle, partait normalement : le flux avait
toutes les apparences du bon fonctionnement.

**Ce que ça coûtait.** Un postback de conversion arrive avec un clickId
`w2p-…`, `getClickById` ne trouve pas le clic, et l'attribution du FTD part à
l'admin. Ce n'est pas une statistique manquante, c'est le métier.

**Deux précautions reprises de BetsRank, et une écartée.**

· **On n'écrit que si la lecture a abouti.** Écrire après une lecture ratée
  remplacerait le tableau du jour par un tableau d'un seul élément : un timeout
  Upstash effacerait tous les clics de la journée, des deux sites.

· **`casinoId` est rempli pour de bon.** Les ids de `Casino` sont ceux de
  BetsRank (Vave = 117 des deux côtés) : c'est la clé du CPA, la laisser à zéro
  aurait rendu le clic inexploitable pour le revenu.

· **Aucune expiration posée**, contrairement à la version précédente. La clé
  n'en a pas côté BetsRank (`ttl = -1`) ; un `expire` depuis ici en imposerait
  une à une clé partagée et ferait disparaître des clics BetsRank aujourd'hui
  permanents.

Vérifié en écriture réelle : 50 → 51 clics, les 50 de BetsRank intacts, `ttl`
inchangé. Dix tests fixent le format avec `ClickLog`.

## 2026-09-12 — La page des avis rendait 4 863 fiches d'un seul tenant

**19,3 Mo de HTML par langue.** Vercel refuse de déployer une page ISR au-delà
de 19,07 Mo (`FALLBACK_BODY_TOO_LARGE`) : le build réussissait, le déploiement
échouait à la dernière étape. Paginée à 24 par page comme le catalogue et les
démos, la plus grosse page pré-rendue passe de **19,3 Mo à 0,24 Mo** — et c'est
désormais `/new-releases`, pas `/reviews`.

Le compte affiché dans l'intro reste le total vérifié (4 863), pas la tranche :
c'est le chiffre qui dit le travail fait, il n'a pas à suivre la pagination.

**Le piège derrière le piège.** Un déploiement raté ne met rien hors ligne :
Vercel conserve le dernier build réussi, le site répond 200, et on croit avoir
déployé. Sept commits de la journée étaient restés au sol de cette façon — le
premier avait oublié `src/app/go/layout.tsx` dans son commit (le fichier
existait sur le poste, `npm run dev` marchait, le build distant non). Depuis,
la règle : après un push, vérifier qu'un **contenu qui n'existait pas avant**
est bien servi, jamais un simple code 200.

## 2026-09-12 — La notif de clic passe par un webhook, pas par le bot

Brancher where2spin sur le bot Discord de BetsRank demandait son jeton. Il
n'est lisible **nulle part** : Vercel marque la variable « Sensitive » (écriture
seule), le portail Discord ne l'affiche qu'à la création, et le `.env.local`
du poste a été écrasé par un `env pull` — 48 de ses 64 variables valent
littéralement `[SENSITIVE]`. Le seul moyen d'en obtenir un serait de le
régénérer, ce qui **invaliderait celui de BetsRank** et ferait tomber l'autre
bot le temps de le remettre partout.

Un webhook de salon n'a aucun de ces défauts : il se crée dans les réglages du
salon, son URL est le seul secret, il se révoque seul, et il ne demande ni
jeton de bot ni identifiant de serveur. `DISCORD_WEBHOOK_CLICS` est donc le
chemin par défaut ; le bot reste en repli, pour ne rien casser là où il est
déjà configuré. Quatre tests couvrent le nouveau chemin, dont la bascule vers
le bot quand le webhook échoue.

Accessoirement : **rien dans where2spin n'appelle Telegram.** Ce bot-là est
entièrement côté BetsRank, il n'y a aucune variable à poser ici.

## 2026-09-12 — La fiche de jeu se déclare enfin sur son sujet

Une fiche affichait **679 mots**, dont la moitié en étiquettes et en noms de
casinos. Sur « gates of olympus rtp », une page qui ne développe rien n'a
aucune raison de passer devant celles qui développent.

**Le défaut le plus coûteux n'était pas la longueur.** Le `h1` portait « Où
jouer Gates of Olympus » — la même phrase que le `h2` du bloc des casinos,
trente lignes plus bas. La page se déclarait sur une intention d'achat au lieu
de se déclarer sur son sujet, et dupliquait son propre titre. Le `h1` porte
maintenant le nom du jeu, c'est-à-dire ce que le visiteur a tapé.

**Un texte dérivé, pas rédigé.** `src/lib/analyse-jeu.ts` construit cinq
sections et une FAQ à partir des champs de la base : RTP et sa provenance,
paliers opérateur, RTP d'achat de bonus, volatilité, plafond, construction du
jeu, et ce qu'on a vérifié soi-même. **Un fait absent ne produit pas de
phrase** — pas de formule de remplissage, pas de superlatif. C'est ce qui fait
la valeur du texte : il dit ce que les autres ne savent pas dire, parce qu'ils
n'ont pas relevé le chiffre dans la démo. Résultat mesuré sur les 5 831 fiches
indexables : **+243 mots en moyenne**, aucune sous 100.

**La FAQ est déclarée en `FAQPage`.** Une question n'est posée que si le fait
existe : une FAQ qui répond « nous ne savons pas » à une question qu'elle a
elle-même posée est une mauvaise réponse offerte à Google.

**Trois phrases fausses attrapées à la relecture, pas en production.**

· « 25 000x **la mise totale** » sur Lightning Blackjack. Le chiffre est juste,
  la phrase est fausse : une cote de table porte sur une case de mise, pas sur
  le tapis. Les tables live sont maintenant reconnues à ce que la base en dit
  (grille « Live Studio », mécanique « Dealer HD 24/7 ») et n'affichent plus ni
  plafond ni grille — un faux positif vaut mieux qu'une phrase fausse.

· « Pay Anywhere (8+ symbols) **lignes de paiement** ». `lignesPaiement` n'est
  pas toujours un nombre ; le traiter comme un compte produisait une phrase qui
  ne veut rien dire sur une part entière du catalogue.

· « eine **hoche** Volatilität ». L'allemand fléchit l'adjectif : coller un `e`
  au radical donnait cette forme sur toutes les fiches allemandes à volatilité
  haute.

**Au passage**, ` · released 2021` était écrit en anglais en dur sous le titre,
dans les trois langues.

## 2026-09-12 — Le site parle vraiment trois langues

Une passe complète sur l'interface : la version française lisait l'anglais sur
une bonne moitié de l'écran, et rien ne le signalait — une chaîne écrite en
dur compile parfaitement.

**Ce qui était en dur dans les composants.** Étiquettes de la fiche, filtres
du catalogue, pied de page, pagination, titres de pages, bouton
d'enregistrement : une trentaine de textes ont rejoint `src/i18n/textes.ts`,
où le typage force les trois langues. Vingt-quatre clés nouvelles.

**Le piège qui a coûté le plus de temps.** Le test de garde ne voyait pas les
nœuds JSX qui **mêlent une interpolation et des mots en dur** — `{total}
games`, `Show {n} more partners`, `{g.minutes} min read`. Sa capture excluait
les accolades, donc il les ignorait tous et passait au vert sur une page à
moitié anglaise. Il les prend maintenant, retire les interpolations, et juge
ce qui reste ; un seul mot anglais suffit désormais à le faire échouer.

**Trois guides sur quatre n'existaient qu'en anglais.** Le repli de
`contenuDuGuide` est un filet, pas une destination : il affichait l'anglais
sans jamais dire qu'il manquait une traduction. Les trois sont écrits en
français et en allemand, et un test refuse désormais un guide incomplet.

**Les titres de captures se traduisent, les noms de mécaniques non.** Les
6 793 captures portent 114 titres écrits par le pipeline en anglais — « The
base game », « Game rules, page 2 ». Les écrans génériques d'une démo sont
traduits, la pagination garde son numéro. Mais Megaways, Cluster Pays, Hold &
Spin, Pay Anywhere restent tels quels : ce sont les noms que les studios leur
donnent, et les traduire inventerait un nom qui n'existe nulle part.

**Les mécaniques et les offres sont traduites au rendu, pas en base.** 5 805
mécaniques distinctes et 44 offres : les stocker traduites, c'est 17 000
lignes à maintenir et deux traductions périmées dès qu'un partenaire change
son bonus. `src/lib/traduire-donnees.ts` les dérive — dictionnaire des termes
génériques, puis règles de préfixe où le terme connu passe en français et le
reste est conservé. **Aucun chiffre n'est touché** : les tests comparent la
suite des nombres avant et après, dans les trois langues.

**L'écran de sortie s'affichait sans aucun style.** `/go` vit hors de
`[langue]`, donc hors du layout qui charge la feuille de style et les trois
polices — et `src/app/go/layout.tsx` était resté celui que `create-next-app`
écrit : titre « Next.js », `lang="en"` en dur, aucun CSS. La dernière page
qu'un visiteur voit de nous avant de partir chez un partenaire s'affichait en
Times New Roman sur fond blanc. Elle est maintenant à la marque, en
`noindex` — une page de tracking n'a rien à faire dans un index — et son
attribut `lang` suit la langue demandée.

## 2026-09-12 — La démo remonte à sa place, et se joue sur la fiche

Le bouton de démo vivait **après la liste des casinos** — c'est-à-dire après
qu'on a demandé au visiteur de choisir où déposer. L'ordre suit maintenant
celui d'une décision : ce que le jeu est (les captures), l'essayer (la démo),
puis où y jouer pour de vrai (les casinos).

**La démo se joue sur la fiche quand c'est possible.** Ni Pragmatic ni les
studios ne posent de `X-Frame-Options` ou de `frame-ancestors` : le cadre est
autorisé. Mais il n'est chargé **qu'au clic**, sur la jaquette du jeu — un jeu
embarqué pèse plusieurs mégaoctets et part chercher le studio dès l'ouverture
de la page, alors que la majorité des visiteurs vient lire un RTP.

**Ce qu'on embarque, et ce qu'on n'embarque pas.** Chez Pragmatic, `demoUrl`
est un lanceur (`openGame.do`) : il ouvre le jeu seul, comme dans le lobby
d'un casino. Chez Hacksaw, BGaming ou Play'n GO, c'est la **page produit** du
studio, menu et pied de page compris — l'embarquer donnerait un site dans le
site. Le test est conservateur : dans le doute, on envoie vers le studio.

**Au passage, deux défauts de données corrigés.** Douze lanceurs Pragmatic
pointaient vers une démo en français, en indonésien ou en thaï : le lecteur de
règles cherche des mots anglais et l'icône des règles à sa place habituelle,
d'où l'échec silencieux de Mystery Mice. Remis en `lang=en&cur=USD`, ce qui a
débloqué Cyber Pup Megaways et Himalayan Wild dans la foulée (96,09 % et
96,51 %, ce dernier en écart avec la base). Restent Chicken Plus, dont la page
produit renvoie un 404, et High Flyer, qui ne livre pas son identifiant de
démo : leurs plafonds de 3 000 000x et 1 000 000x restent non vérifiés.
## 2026-09-12 — Chaque capture a son texte, dans les trois langues

Sur Gates of Olympus, chaque capture porte une légende écrite ; ailleurs, la
plupart sortaient nues. Mesuré : **5 018 captures sans légende sur 6 777**, et
les 1 759 restantes en anglais sur les trois versions du site. Le pipeline
n'en écrivait que pour trois cas — le jeu de base, la page qui porte les
chiffres, l'achat de bonus.

**Les légendes sont désormais calculées au rendu**, pas stockées. Les écrire à
la main, c'était 5 018 textes en trois langues ; les stocker, c'était les
figer — une capture refaite avec de nouveaux chiffres aurait gardé sa vieille
légende. Elles se déduisent de ce que la capture montre (jeu de base, table de
gains, mécanique, commandes, réglages, jeu automatique, page de règles,
plafond, achat) et de ce que le jeu déclare : justes par construction,
traduites par construction.

La page qui porte les chiffres reprend les valeurs dans l'écriture de la
langue — « RTP 96,51 % · gain maximum 21 100× » en français, « 21,100× » en
anglais, « 21.100× » en allemand — et **attribue la volatilité au jeu**
(« volatilité annoncée très haute »), conformément à la décision d'hier.

**Les six légendes écrites à la main de Gates of Olympus sont conservées et
traduites**, pas régénérées : elles décrivent des mécaniques qu'aucun modèle
ne résume. Toute autre fiche peut en recevoir — une entrée dans la table
l'emporte sur le modèle. Les formules posées par le pipeline, elles, sont
reconnues et remplacées.

L'introduction du bloc et la date de capture passent aussi en trois langues.
Les **titres** restent tels quels : ce sont les noms des pages du jeu (« How
to play », « Settings menu »), on cite son interface plutôt que de la traduire.

8 tests : reconnaissance du type de capture, aucune capture sans texte dans
les trois langues, écriture des nombres par langue, attribution de la
volatilité, priorité des textes écrits à la main.
## 2026-09-12 — La volatilité est attribuée, plus affirmée

Le panneau de règles déclare une volatilité, et nous la lisions comme le
reste. Vérifié à l'image sur quatre jeux : Pragmatic écrit bien **« LOW
VOLATILITY — Low volatility games pay out more often in smaller amounts »**
en tête des règles de Christmas Carol Megaways (plafond 20 000x) et de
Barnyard Megahays Megaways (10 000x). Ce n'est pas une erreur de lecture : le
badge distingue bien les jeux, Gates of Olympus ressort en très haute.

Mais un plafond et un RTP sont des mesures ; ce badge est un **classement**
dont nous ignorons la base. **108 de nos 240 jeux « basse » plafonnent
au-dessus de 5 000x** : publier ce mot comme notre verdict tromperait le
joueur.

La fiche l'attribue donc désormais — « Low · as the game states it ». C'est
exact, c'est vérifiable par la capture, et c'est l'argument du site : dire
d'où vient chaque chiffre plutôt que trancher sans source.
## 2026-09-12 — Trois secondes sous notre marque avant de partir

La sortie vers un partenaire était une 302 immédiate : le visiteur quittait
where2spin sans transition. Elle devient un **écran d'attente de trois
secondes** — le logo qui respire, le nom du casino, son bonus rappelé, un lien
de secours —, comme le fait déjà BetsRank. Trois secondes suffisent à lire le
bonus ; au-delà, on ferait attendre pour rien.

**Ce qui n'a pas changé, et ne devait pas.** Le clic est enregistré **côté
serveur, avant l'affichage** : pas de `fetch` depuis le navigateur, donc un
bloqueur de scripts ne peut pas effacer un lead. Le clickId garde son préfixe
`w2p-`. Sans JavaScript, un `<noscript>` en rafraîchissement et le lien de
secours emmènent quand même le visiteur.

`/go` vit hors du segment de langue : le lien sortant porte donc `&l=` et
l'écran parle la langue de la page d'où l'on vient, avec repli sur l'anglais.

**Le bot Discord de BetsRank reçoit aussi nos clics.** Même salon
`#staff-flux-clicks` — deux salons obligeraient à surveiller deux endroits pour
un flux unique. Ce qui distingue les deux sites est dans le message : un champ
**Site** (🔷 where2spin / 🟡 BetsRank), la couleur de l'embed, et surtout le
préfixe `w2p-` du clickId, seule marque à survivre jusqu'à la conversion.

La notification ne retient jamais le visiteur : jeton absent, salon
introuvable, Discord en panne, réseau coupé — elle renonce, elle ne lève pas.
Quatre tests fixent ce contrat.

**À brancher côté Vercel where2spin** : `DISCORD_BOT_TOKEN` et
`DISCORD_GUILD_ID` (et, pour éviter un appel, `DISCORD_SALON_FLUX_CLICS`).
Sans elles, l'écran de sortie fonctionne et les notifications se taisent.
## 2026-09-11 — Campagne Pragmatic : 275 jeux, et un écart tranché à l'œil

La file Pragmatic a tourné en entier, sans tête, 15 secondes entre deux jeux :
**275 jeux traités, 198 RTP lus au panneau, 18 sans panneau, 0 bannissement**.
La politesse paie : la campagne BGaming s'était arrêtée sur un 1015 après
~230 démos rapprochées ; ici, rien.

**155 jeux affichent un RTP différent de celui que portait la base.** Sur 75
d'entre eux, `resoudre-ecarts` a relu la capture en plein cadre, à double
résolution : **75 confirmés, 0 infirmé**. Ils sont alignés sur leur panneau.

**Triple Tigers a été tranché en regardant l'image.** Base 96,52, panneau
97,52 : un point d'écart, et pile le genre de saut qu'une erreur de chiffre
produit (6 lu 7). La double lecture ne prouve rien ici — elle dit que l'OCR
est stable, pas qu'il a lu la bonne ligne. J'ai donc téléchargé la capture
depuis Supabase Storage et lu le panneau : « The theoretical RTP of this game
is 97.52 % », sur les deux pages de règles capturées. Le chiffre est bon.

441 preuves écrites (43 rtpStudio, 200 volatilités, 198 gains max), toutes
adossées à une capture qui montre la valeur. 971 fiches portent un RTP sans
source : elles restent sans preuve, volontairement.
## 2026-09-11 — Ce que le contrôle d'identité écarte encore, et pourquoi c'est juste

Cinq studios aux pages souvent écartées ont été simulés en entier, pages
écartées nommées. Ce qu'ils disent :

- **Fugaso sert parfois une page vide.** Ouverte seule, la fiche de Mega
  Thunder porte son `og:title` ; lue dans une série de pages, elle arrive sans
  titre, sans `h1`, sans `og:title` — la coquille d'un site en rendu serveur,
  que le JavaScript devait remplir. Le contrôle ne peut rien confirmer et
  n'écrit rien : c'est le bon côté pour se tromper.
- **Caleta et King Midas nomment leurs jeux autrement que leurs adresses** :
  `pao-com-manteiga` pour « Hi-Loaf », `fortune-wolf` pour « Lobinho Fortuna »,
  `coin-dozer` pour « COIN PUSHER ». Sans doute les mêmes jeux, sous un nom
  localisé — mais rien ne permet de l'affirmer. Écartés.
- **Fantasma** garde des pages de travail dans son catalogue (`…-slider-test`).
  Écartées.
- **Un défaut du contrôle lui-même** : « Hold & Hit **3×3** » chez Spinomenal.
  Le signe de multiplication devenait une espace, et le « 3x3 » de notre nom ne
  s'y retrouvait plus. Corrigé : **23 RTP récupérés** sur 26 pages. Les trois
  restantes sont de vraies divergences (« 4horsemen2 » pour « 4 Horsemen II »).

**Pragmatic** : trois lots d'écarts de plus confirmés par double lecture (13,
puis 30), dont Ratinho Sortudo relu dans son panneau avant écriture — « The
theoretical RTP of this game is 97.57% », une phrase unique, sans RTP d'achat
à côté.

## 2026-09-11 — Une page écartée dit pourquoi, et Starburst XXXtreme reste en doute

Chaque page que le contrôle d'identité écarte est désormais **nommée dans le
rapport** avec le titre qu'elle porte (`og:title` d'abord, puis `<title>`, puis
`h1`). C'est ce qui sépare une vraie fausse page — « Game Not Found » chez
Amusnet et Peter & Sons, statut 200, sans redirection — d'une page juste dont le
titre est formulé autrement que notre nom.

**Starburst XXXtreme, 96,45 %, porte une note de doute.** La page produit de
NetEnt affiche 96,45 % sans rien préciser. Mais la fiche de BetsRank écrit :
« NetEnt publie un RTP de 96,26 % en jeu standard, qui passe à 96,45 % lorsque
les XXXtreme Spins sont activés ». Si c'est exact, 96,45 % est le taux **avec
fonction**, et il ne peut pas être le RTP du jeu. BetsRank a été remis à
96,26 % ; la confrontation continuera de signaler cet écart, volontairement,
jusqu'à ce qu'une source du studio tranche.

Côté BetsRank, l'outil d'arbitrage de la base a été doté de gardes de phrase
après avoir abîmé 39 phrases nuancées dans la journée — restaurées depuis les
sauvegardes. Voir son carnet.

## 2026-09-11 — 3 350 RTP lus sur les pages produit de trente studios

Le lecteur générique appliqué à trente studios : **3 350 fiches reçoivent un
RTP** que le studio publie lui-même. Les plus gros apports : Spinomenal 541,
Red Tiger 328, Amusnet 258, Wazdan 256, 1spin4win 227, Stakelogic 206, Evoplay
201, Fantasma 151, Caleta 148. **Aucun désaccord avec un panneau de jeu.**

Le seuil de relecture a mis de côté **huit** remplacements, tous relus dans leur
page avant d'être écrits avec `--slugs` : six Nolimit City où l'import avait
retenu la version basse d'un jeu qui en publie plusieurs (Folsom Prison
94,01 → 96,07 %), et deux Red Tiger (Mystery Reels Megaways 96,18 → 98,06 %,
Cash Volt 94,78 → 95,71 %) — chaque fois, la page donne le même chiffre dans son
titre, ses détails et son JSON, et la valeur d'import n'y apparaît nulle part.

### Le contrôle d'identité, affiné

- **Amusnet et Peter & Sons** servent de fausses pages trouvées — « Game Not
  Found », statut 200, sans redirection — y compris à des adresses tirées de
  leur **propre** sitemap. Le contrôle les écarte, à raison.
- **Fugaso** n'a ni `<title>` ni `<h1>` dans le HTML servi : le nom du jeu
  n'est porté que par `og:title` (« MEGA THUNDER »). Le contrôle l'accepte
  désormais, avec `twitter:title`.
- Chaque page écartée est **nommée dans le rapport** avec le titre qu'elle
  porte : c'est ce qui distingue une vraie page introuvable d'un titre formulé
  autrement que notre nom.

Les faits vérifiés exportés vers BetsRank passent à **4 709**.

## 2026-09-11 — Un gros écart ne s'écrit plus sans relecture

Toute la soirée, la même règle a évité les erreurs : **un gros écart se relit
dans sa phrase avant d'être écrit**. Elle ne tenait qu'à la vigilance de celui
qui lance le script. Or une simulation ne couvre qu'un échantillon — douze
pages par studio — et l'application parcourt des milliers de pages.

`lire-fiches-produit.ts` met désormais de côté tout remplacement de plus d'un
demi-point (`--seuil=` le règle) : il le liste sous « à relire », il ne l'écrit
pas. Les fiches sans chiffre en base reçoivent leur RTP normalement — il n'y a
rien à contredire.

**Le contrôle d'identité a déjà servi.** Chez Peter & Sons, dix pages sur douze
répondent 200 avec le titre « Game Not Found » : de fausses pages trouvées,
sans redirection. Le contrôle les a arrêtées et a laissé passer la vraie page de
3 Piggy Brothers.

**SpinOro écarté de l'application** : erreurs 500 et délais dépassés sur dix
pages sur douze. Insister sur un site qui répond mal, c'est ce qui a valu à
where2spin le ban du serveur de démo BGaming.

## 2026-09-11 — Le lecteur générique lit les entiers, et n'exclut plus trop large

Deux studios rendaient zéro RTP sur douze pages alors que leurs pages en
publiaient un. Relus au texte près :

- **AvatarUX** écrit « RTP **96%; 94%; 90.5%** » : des entiers, et un
  point-virgule comme séparateur. Le lecteur exigeait une décimale — le défaut
  déjà payé côté panneau de règles. L'entier est accepté, seulement suivi de
  « % », et un nombre ne peut plus être la fin d'un autre (« 196% »).
- **Koala** écrit « … Spin Till You Win **Buy Feature Stats** RTP 96.25%, … ».
  Le lecteur excluait toute valeur précédée de « Buy Feature » dans les 40
  caractères — or c'est la fin d'une liste de fonctions, suivie d'une nouvelle
  rubrique. La fenêtre dépend désormais de la forme : **12 caractères** quand le
  sigle précède le nombre (une rubrique : seuls les mots collés devant
  comptent, « Bonus Buy RTP » reste exclu), **25** quand le nombre le précède
  (de la prose : « Grand Jackpot Set at 94.36% RTP » reste exclu).

Résultat sur douze pages : AvatarUX 0 → 12, Koala 0 → 11, Revolver 2 → 9.
Trois tests de plus, recopiés de ces pages.

## 2026-09-11 — Lire une page, mais seulement la bonne

Les 29 studios du lecteur générique n'ont **aucun chiffre en base** à
contredire : si le lecteur lit la mauvaise page, rien ne le signale. Or pour
les studios issus de la prospection, l'adresse de la page est reconstruite à
partir de notre slug, et une adresse reconstruite peut aboutir ailleurs.

Deux garde-fous, avant toute lecture :

- **L'adresse finale** doit porter encore le slug demandé. Un site qui redirige
  vers son accueil, une liste ou la fiche d'un autre jeu est ignoré.
- **Le titre ou le premier intitulé** de la page doit contenir **tous** les
  mots distinctifs du nom du jeu — un seul suffirait à confondre « Book of
  Kemet » et « Book of Ra ». Comparaison sans espaces, pour que « Dragon's Gold
  100 » reconnaisse « dragons gold 100 ». C'est ce qui arrête une « page
  introuvable » habillée, qui répond 200 sans rediriger.

Sur 46 pages de six studios, aucune n'a été bloquée à tort. Les pages sans
chiffre observées sont de vrais cas vides : Elbet construit ses fiches en
JavaScript, rien n'est lisible, rien n'est écrit.

## 2026-09-11 — Un lecteur générique pour trente et un studios

Un sondage de deux pages produit par studio sur les 84 restants : **34
publient un RTP lisible en HTML**, soit environ 4 990 fiches. Chacun à sa
façon — d'où un seul lecteur générique aux règles strictes plutôt que trente
lecteurs sur mesure. Il ne lit **que le RTP** : gains maximums et volatilités y
prennent trop de formes piégées (« € 254 953 », « 3000 x bet per line »,
« Volatility: 1 / 5 ») pour être lus sans lecteur dédié.

Ses règles, chacune tirée d'une page réelle et verrouillée par un test :

- **Une liste de versions donne son haut.** Spinomenal écrit « 88.85% |
  91.55% | 93.61% | 95.42% » et Elbet « 92.67% 94.47% 96.34% 97.31% », du plus
  bas au plus haut ; Gaming Corps va dans l'autre sens. Prendre le premier
  nombre serait faux une fois sur deux. Le haut devient le taux, les autres des
  paliers, enregistrés en base et nommés dans la preuve.
- **Jamais à côté d'un achat de bonus ni d'un jackpot** : « RTP w. Bonus Buy
  96.24% » (Print Studios), « Grand Jackpot Set at 94.36% RTP » (Dragon Gaming).
- **Le sigle collé au nombre**, avant ou après ; un nombre isolé ne vaut rien.

Branchés : 29 studios au lecteur générique, Red Tiger et Nolimit City au
gabarit NetEnt, qu'ils partagent (groupe Evolution). **Écartés malgré un RTP
visible** : Pragmatic (« RTP: 96.50% » sur ses pages — le chiffre rond de
l'import, là où ses panneaux donnent 96,46 ou 96,36 : une valeur générique qui
donnerait l'apparence d'une source à un remplissage), Dragon Gaming (RTP
seulement dans une phrase de jackpot), Wicked (pages « TBD » de jeux à
paraître), Habanero (page construite en JavaScript).

`lire-fiches-produit.ts` sait désormais lire les studios issus de la
prospection, qui n'ont pas d'adaptateur d'inventaire : l'adresse se reconstruit
à partir du motif noté ce jour-là (« familles /games/<slug> »).

## 2026-09-11 — 508 RTP lus sur les pages produit, et 16 écarts Pragmatic tranchés

Les lecteurs de fiches produit ont été appliqués aux trois studios dont la page
publie le RTP en HTML. Aucune donnée inventée : un champ n'est rempli que si la
page l'énonce sans ambiguïté, et le panneau du jeu garde toujours le dernier mot.

| studio | pages | RTP ajoutés | confirmés | remplacés | désaccords (panneau gardé) | sans chiffre |
|---|---|---|---|---|---|---|
| NetEnt | 236 | 210 | 20 | 2 | 0 | 3 |
| Endorphina | 234 | 218 | 4 | 0 | 0 | 10 |
| BGaming | 343 | 80 | 172 | 13 | 8 | 69 |

Chez BGaming, **172 pages confirment le chiffre déjà en base**, dont la centaine
lue au panneau : c'est la validation croisée qui manquait au lecteur. Les 8
désaccords restants sont sains — le jeu dit clairement 96,1 %, la page arrondit
autrement — et le panneau l'emporte. Les remplacements de plus d'un demi-point
ont été relus dans leur phrase avant écriture : Mice & Magic Wonder Spin
(96,93 → 94,96 %, écrit deux fois sur la page, sans plage ni variante),
Treasure Explorer (96 → 97,07 %), Fiesta Clusters (97,5 → 97 %).

Chez Endorphina, les 10 pages « sans chiffre » incluent Satoshi's Secret, dont
le lecteur a refusé le bas de plage (« ranges from 89.83% ») au lieu de le
publier comme taux.

**La campagne Pragmatic** sur la file des jeux déjà échoués a produit 16 écarts
avec la base, tous partis du 96,5 % rond de l'import : 16 confirmés par double
lecture, aucun infirmé, le plus gros d'un demi-point.

Les faits vérifiés exportés vers BetsRank passent de 516 à **1 150**. Confrontés
au catalogue de BetsRank : 642 identiques après arbitrage, 508 portent sur des
jeux que BetsRank ne catalogue pas.

## 2026-09-11 — Jackpot, plage et « Medium-Low » : trois lectures fausses arrêtées

La page produit a validé le panneau sur 168 fiches BGaming — et en a
contredit 12. Relus un par un, ces désaccords ont révélé trois défauts, dont
aucun ne se serait signalé tout seul.

**Le jackpot entre parenthèses.** Quatre jeux BGaming (Grand Buffalo Hold and
Win, Stars & Stripes Hold and Win, Olympus Trueways, Wild West Trueways)
écrivent : « The overall theoretical RTP is **96.23% (without Jackpot) - 96.7%
(with Jackpot)** ». La règle de plage n'y voyait rien — une parenthèse sépare
le premier nombre du tiret — et l'extraction gardait 96,23 : le taux hors
jackpot, publié sans le dire, alors que le studio met en avant 96,70 sur sa
page produit. Pire, ce chiffre était déjà parti sur BetsRank dans l'après-midi,
remplaçant un 96,7 % qui était le bon. Le haut devient le défaut, le bas un
palier ; la légende garde « with / without jackpot ». Les 116 fiches BGaming
sourcées relues : ces quatre-là seulement.

Les autres désaccords sont sains : sur `always-up-x10000` ou `wild-cash-dice`,
le jeu dit clairement 96,1 % et la page produit arrondit autrement. Le panneau
l'emporte, comme prévu, et rien n'est écrit.

**Le bas d'une plage déguisé en taux.** Endorphina écrit, sur Satoshi's
Secret, « RTP: 89.83% » dans ses détails et « The RTP ranges from 89.83% »
dans sa FAQ : seul le bas de la plage est donné. Le lecteur l'aurait pris pour
le taux et remplacé 96,07 — l'erreur de Four Lucky Clover, côté page produit.
Face à « ranges from », le lecteur ne publie plus rien.

**« Medium-Low » lu comme « Medium ».** Le tiret compte comme une fin de mot :
l'expression s'arrêtait au premier libellé trouvé. Un libellé suivi d'un tiret
ou d'une lettre ne vaut plus rien. Deux tests, un par studio.

**NetEnt appliqué** : 236 pages produit, **210 fiches reçoivent un RTP**, 20
confirmations, 2 valeurs d'import remplacées après lecture de la page
(Starburst XXXtreme : la page dit 96,45 % dans son titre, son JSON et ses
détails ; Dead or Alive 2 : 96,8 %, le JSON portant aussi ses composantes de
base et de bonus, que le lecteur ignore).

## 2026-09-11 — La page produit, une source qui passe à l'échelle

Capturer un panneau de règles coûte un navigateur, un OCR et un rechargement
complet du jeu — et le serveur de démo de BGaming nous a mis au ban ce soir.
Or le champ `ouSourcer` le disait déjà : chez **BGaming, NetEnt et
Endorphina**, la page produit publie le RTP en HTML ordinaire. Une requête
suffit, sans écran, sans OCR, sans toucher au serveur de démo.

Sondés sur deux pages chacun :

| studio | forme | lu |
|---|---|---|
| BGaming | bloc « Game Details » : `RTP 96.00 %`, `Volatility Very-high`, `Max.multiplier x 10000` | RTP, volatilité, gain max |
| NetEnt | JSON dans la page `"rtp":95.62`, « 1 700 x bet Max payout » | RTP, gain max |
| Endorphina | `RTP: 94.76%`, `Volatility: High` | RTP, volatilité |
| Habanero | rien dans le HTML servi — page construite en JavaScript | écarté |

`src/lib/fiches-produit/lecteurs.ts`, fonctions pures, sept tests recopiés des
pages réelles. Trois pièges verrouillés :

- BGaming écrit `x 10.490` : le point **sépare les milliers**. Lu comme une
  décimale, le gain maximum de Lucky Lager tombait à 10,49 fois la mise.
- « Max Win € 250,000 » est **en euros** : jamais pris, seul un multiple de la
  mise se compare d'un jeu à l'autre.
- La volatilité de NetEnt est une note chiffrée (`5.1`) sur une échelle qu'on
  ne sait pas convertir : **laissée vide** plutôt qu'inventée.

`scripts/lire-fiches-produit.ts` les applique, une page à la fois avec une
pause. **Le panneau du jeu l'emporte** sur la page produit : une fiche déjà
lue au panneau n'est jamais écrasée, un désaccord est seulement signalé.
Ailleurs, la page produit remplace la valeur d'import et la preuve garde la
trace de ce qu'elle remplace. Sur un échantillon de 45 pages : 39 fiches
recevraient un RTP qu'elles n'ont pas, et les quatre déjà lues au panneau
donnent **le même chiffre** sur leur page produit.

## 2026-09-11 — La double lecture ne voit pas une mauvaise phrase

Avant d'écrire dans BetsRank les 33 RTP BGaming qui le contredisaient, les sept
plus gros écarts ont été relus **dans leur phrase**. Deux étaient faux chez
nous, et la double lecture les avait confirmés.

BGaming écrit, pour ses jeux à stratégie : « The overall theoretical Return to
Player (RTP) is **89,41 - 94,00%** depending on the player's strategy ».
L'extraction s'arrêtait au premier nombre — le **bas** de la plage. Four Lucky
Clover passait à 89,41 % au lieu de 94 %, Four Lucky Diamonds à 92,84 % au lieu
de 94,03 %. Et BetsRank, qu'on s'apprêtait à « corriger », avait raison pour le
second.

**Pourquoi la double lecture n'a rien vu** : ses deux lectures passent par la
même interprétation. Elle prouve que l'OCR est stable, pas qu'on a lu la bonne
phrase. Le vrai contrôle, pour un écart important, reste de relire la phrase.

L'extraction lit désormais une plage « A - B % » par son haut, le bas devenant
un palier (la convention de « maximum RTP / minimum RTP »). Un test recopié du
texte OCR. Les 116 fiches BGaming sourcées ont été relues à la recherche d'une
plage : **ces deux-là seulement**, corrigées en base avec leur palier, leur
légende et une note sur la preuve.

## 2026-09-11 — Le runner s'arrête sur un ban, et le post-traitement BGaming

### S'arrêter au lieu de s'enfoncer

Pendant le ban Cloudflare de BGaming, chaque jeu échouait en « icône des règles
introuvable » et la campagne continuait d'en lancer — ce qui prolonge un ban et
remplit le journal de faux défauts d'adaptateur. Le runner reconnaît désormais
le ban à deux signes : un **HTTP 429** sur une navigation de la page principale,
ou la page Cloudflare portant **à la fois** « Error 1015 » et « rate limited ».
Les deux ensemble, parce qu'un jeu peut embarquer « Too Many Requests » dans son
code et qu'un gain maximum peut valoir « x1015 ». Dès le premier signe, la
campagne s'arrête et dit où elle en est ; les jeux non traités restent en file.

La détection vit dans `src/lib/captures/limite-de-debit.ts`, fonction pure, trois
tests — dont les deux faux positifs qu'elle doit refuser.

Un adaptateur peut aussi déclarer `pauseEntreJeuxMs`, remplaçable par
`--pause=`. BGaming est à 30 s : **une précaution, pas un seuil mesuré** — on ne
connaît pas celui de Cloudflare. Le garde-fou, c'est l'arrêt.

### Le post-traitement de la campagne

- `relire-captures` : 12 fiches photographiées sans chiffre relues, **6 ont leur
  RTP**, 2 écarts passés à la double lecture, 4 sans RTP sur les pages prises.
- `resoudre-ecarts` : **32 écarts, 32 confirmés** par la seconde lecture,
  0 infirmé.
- `adopter-preuves` : **388 preuves** écrites.

Confrontés à BetsRank, les faits vérifiés sont 490 : 457 identiques, **33
différents, tous BGaming**, tous à corriger dans son fichier statique.

## 2026-09-11 — Une bande jetée en silence, un RTP rond, et un ban

### La bande que le runner jetait

Le runner passait aux adaptateurs une fonction `regarder = async () =>
lireLEcran(sonde)` **sans paramètre**. Un adaptateur qui demandait
`lireLEcran('bas')` recevait la bande par défaut — le haut de l'écran — et
TypeScript l'acceptait, une fonction sans paramètre valant pour une fonction à
paramètre optionnel. Conséquence : **la détection des jeux Pragmatic sans
panneau de règles n'a jamais marché en production**. Elle cherche « COIN
VALUE / TOTAL BET » en bas ; elle regardait en haut. Ces jeux sortaient en
« icône introuvable », restaient en file et étaient rechargés à chaque
campagne. Corrigé : `888-gold-slot` est désormais reconnu sans panneau.

### Le RTP rond

BGaming écrit « The overall theoretical Return to Player (RTP) is 96%. » — un
entier. Exiger une décimale laissait des fiches photographiées, publiées, et
sans chiffre. L'entier est accepté **seulement suivi de « % »**, pour qu'un
« 20 lines » ne passe pas pour un taux. Deux tests.

`scripts/relire-captures.ts` relit les captures déjà publiées avec les
formules du jour, sans recapturer : le panneau est déjà photographié. Il
n'écrit un RTP que s'il ne contredit pas la base ; sinon il pose la légende et
laisse `resoudre-ecarts.ts` trancher par double lecture.

`--slugs` vise des jeux précis, **y compris déjà capturés** : c'est le seul
moyen de faire passer un jeu connu pour marcher dans le vrai runner.

### La campagne BGaming, et pourquoi 45 % échouent

227 jeux, 120 publiés. Diagnostiqués sur de vrais écrans, les échecs n'ont pas
une cause mais plusieurs :

- le moteur **« hyperhive »** : 22 échecs sur 99, **0 réussite sur 118** — une
  cause isolée, le prochain chantier ;
- des **écrans de choix** avant la partie : personnage puis pays sur
  Soccermania, nombre de lignes sur All Lucky Clovers ;
- le **portail 18+** de bgaming.com, resté fermé sur Sweet Rush Megaways ;
- **12 jeux sans démo** sur leur page, **6 dont la démo est hébergée par un
  casino** : jamais capturables chez BGaming.

### Le ban, et la conclusion fausse qu'il m'a fait tirer

Vers 18h, `demo.bgaming-network.com` a répondu **« Error 1015 — You are being
rate limited »** (HTTP 429, Cloudflare) : 227 lancements en ~2h40, plus mes
relances de diagnostic. Pendant le ban, chaque jeu échoue en « icône
introuvable ». Deux tests de non-régression ont ainsi « échoué » sur des jeux
qui marchaient, et j'en ai d'abord conclu que mon correctif du clic de départ
les cassait. **C'était faux** : le vrai runner échouait aussi, sans ce
correctif. Tous les tests postérieurs à 18h sont nuls. Le correctif est retiré
quand même — il n'avait récupéré aucun des quatre jeux essayés.

On ne contourne pas un ban. Aucune donnée n'est perdue : les jeux ratés restent
en file.

## 2026-09-11 — 73 RTP corrigés, et deux lectures valent mieux qu'une

Quand le panneau d'un jeu contredit la base, `capturer-jeux` n'écrase pas — un
OCR peut prendre un 6 pour un 7. Mais il publie les captures quand même, et la
fiche montre alors le jeu annonçant 97,1 % à côté d'un chiffre qui dit 96,1 %.
L'écart, lui, n'était consigné nulle part : une ligne de console. La campagne
Hacksaw a tourné en mode réel, son journal a disparu avec `/tmp`.

Il n'était pas perdu. La capture qui porte le RTP garde sa légende (« Stated by
the game itself: RTP 97.1% »). En comparant ce chiffre à la base :
**429 fiches capturées, 308 en accord, 73 en écart** — 63 Pragmatic, 10 Hacksaw.

### La règle : une seconde lecture indépendante

`scripts/resoudre-ecarts.ts` retélécharge chaque capture porteuse et la relit
**autrement** : plein cadre, sans le recadrage de la première lecture, à double
résolution. Le panneau ne remplace la base que si les deux lectures tombent sur
le même chiffre.

**73 confirmés, 0 infirmé, 0 illisible.** Le motif dit d'où venait l'erreur :
la plupart partaient de `96,5` — le chiffre rond de l'import, remplacé par la
vraie valeur (`96,03`, `96,07`, `96,52`…). Les plus gros : `lady-godiva-slot`
94,05 → 96,54, `dwarf-dragon` 95,54 → 96,59, `beware-the-deep-megaways`
97,47 → 96,54. Chaque correction laisse une preuve signée `double-lecture` qui
nomme la valeur remplacée.

### Le runner, corrigé en conséquence

Sur un écart, la volatilité et le gain maximum étaient écrits quand même, alors
qu'ils sortent de la lecture qu'on venait de juger douteuse. Ils suivent
désormais le sort du RTP. Et le runner annonce en fin de campagne le nombre
d'écarts et le script qui les tranche.

## 2026-09-11 — BGaming capture, et lit mieux que notre base

L'adaptateur BGaming était écrit depuis des semaines et n'avait jamais tourné.
Un agent l'a repris, puis a été interrompu au moment de l'inscrire au registre
— inscrit, donc, sans avoir été essayé. Essai refait avant de commiter.

**Quatre jeux sur huit aboutissent.** `adventures` 97,1 · `alice-wonderluck`
97,03 · `alien-fruits` 95,97 · `all-star-fruits` 97,04, de 10 à 14 captures
chacun. Les quatre autres s'arrêtent sur « icône des règles introuvable », ne
publient rien et restent en file. Un adaptateur qui échoue bruyamment sans rien
écrire peut être branché ; c'est celui qui écrirait faux qui ne le peut pas.
La moitié manquante ressemble à l'habillage multiple de Pragmatic — à creuser.

### Deux formules de plus

BGaming intercale le sigle développé — « The overall theoretical **Return to
Player** (RTP) is 97.04% » — et met le signe **avant** le nombre dans le gain
maximum — « The maximum winning amount is ×1500 of the bet ». Aucune des
formules connues n'attrapait l'une ou l'autre : trois fiches se seraient
enrichies d'images et d'aucun chiffre, le mode d'échec le plus coûteux puisqu'il
ne signale rien. Deux tests de plus, recopiés du texte OCR sans retouche.

### La base avait tort d'un point

Sur `adventures`, la base portait **96,1** et le panneau annonce **97,1**.
Un point d'écart pile ressemble à un 6 lu comme un 7 : relu à plus haute
résolution, le jeu écrit bien « The overall theoretical Return to Player (RTP)
is 97.1% ». Le 96,1 venait de l'import. Le garde-fou d'écart n'a rien écrasé —
c'est son rôle — mais il reste un problème : la fiche publierait une capture
qui dit 97,1 à côté d'un chiffre qui dit 96,1.

## 2026-09-11 — Huit studios écrits à la main, sept abandons motivés

Les studios que le prospecteur n'a pas su lire sont souvent ceux que nos
casinos portent le plus. Un agent a repris les quinze plus portés un par un,
à la main. Relecture faite, **huit adaptateurs** entrent et le catalogue passe
de 10 430 à **11 682 fiches** :

| studio | source | jeux créés |
|---|---|---|
| Microgaming | `microgaming.io`, index `sitemaps.xml` au pluriel | 214 |
| TaDa Gaming | sitemap en dix-sept locales, forme nue gardée | 249 |
| Swintt | pagination annoncée en clair par la page | 193 |
| Platipus | état SSR du listing | 159 |
| Tom Horn | sitemap plat | 120 |
| Amatic | titres lus dans l'`alt` des vignettes | 108 |
| Reevo | `reevotech.com` — `reevo.com` est un opérateur télécom | 106 |
| Fugaso | page de listing, faute de sitemap | 103 |

72 slugs déjà pris ailleurs n'ont pas été créés.

### Ce que la relecture a vérifié

**Les domaines surprenants.** `microgaming.io` et `reevotech.com` n'étaient pas
les formes attendues. Ouverts : ce sont bien les studios. Mais Reevo se décrit
lui-même comme une *plateforme d'agrégation* — ses 112 jeux pourraient être
ceux d'autres éditeurs. Aucune page consultée ne crédite de tiers et huit de
nos casinos le listent comme fournisseur : il entre, et le garde-fou de
collision refuse tout jeu déjà présent sous son vrai créateur, comme pour
AvatarUX chez Yggdrasil.

**Amatic ne publie aucune page par jeu.** Le catalogue n'existe que dans la
vignette du listing, titre en clair dans l'`alt` — le `data-name` voisin colle
l'année au titre (« Book Of Aztec 2011 »). Ces 108 fiches ne pourront jamais
recevoir de capture : il n'y a nulle part où lire leur RTP. Elles restent hors
index, et c'est le prix honnête d'un studio qui ne documente pas ses jeux.

**TaDa nomme ses pages en CamelCase** (`/PlusIntro/FortuneTree`). Mesuré sur
les 277 : 232 retombent exactement sur le titre publié, 43 sont rattrapés par
le garde-fou des jumeaux, 4 pages numérotées (`/PlusIntro/81`) sont écartées.

### Sept abandons, chacun nommé

Ezugi (403 Cloudflare), PatePlay (robots.txt interdit `/api/`, seule voie),
SpadeGaming (API enfouie dans un bundle minifié), VoltEnt (site d'une page),
Playtech (le piège connu : des logiciels B2B), Novomatic (fabricant de bornes ;
le catalogue en ligne est chez Greentube, rempli par script) et Lucky Streak
(deux domaines en vente, et des tables filmées hors périmètre).

### Le même défaut, une troisième fois

`--studio=bgaming` lançait l'inventaire **des trente studios** au lieu d'un
seul : ce script ne lisait que la forme séparée. Troisième script du dossier
corrigé pour la même raison. Et un studio sans ligne en base arrêtait
l'inventaire avant même d'interroger son site — on relisait l'adaptateur en
cherchant une erreur qui n'y était pas. Le site est désormais interrogé
d'abord, et la ligne dit le geste qui manque.

## 2026-09-11 — 723 preuves, et 1 702 fiches volontairement laissées sans

La table `Preuve` existait depuis ce matin et était vide.
`scripts/adopter-preuves.ts` l'alimente à partir de ce que les campagnes de
capture ont déjà établi : **723 lignes sur 250 fiches** — le RTP, plus la
volatilité et le gain maximum là où une capture les montre.

### Ce qu'on n'a pas écrit, et pourquoi ça compte plus

**1 702 fiches portent un RTP sans aucune source.** Elles viennent d'un import,
personne n'est allé les vérifier. Leur fabriquer une ligne de preuve sans URL
transformerait « on ne sait pas d'où ça vient » en « c'est sourcé » — l'inverse
exact du but de cette table. Elles restent sans preuve, et c'est l'information
juste.

Même règle à l'intérieur d'une fiche : la volatilité et le gain maximum ne sont
prouvés que si la capture les montre. `capturer-jeux.ts` ne pose une légende
chiffrée que sur la page qui porte le RTP ; ailleurs, ces champs viennent de
l'import, et les rattacher à l'URL du panneau affirmerait qu'on les y a lus.

### Une fausse alerte, notée pour ne pas la relever deux fois

L'écart entre 1 950 pages publiables et 251 sourcées ressemblait à une faute :
des pages indexées avec un RTP que personne n'a vérifié. Vérification faite,
la fiche **affiche son niveau de preuve à l'écran** (`BadgePreuve`), donc elle
ne prétend rien. `estPublieable` reste ce qu'il est : c'est l'absence de donnée
qui disqualifie une page, pas la faiblesse de sa source. Le travail n'est pas
de désindexer, il est de sourcer.

### La campagne Hacksaw

Lancée sur ses 145 jeux capturables. Les échecs observés sont de vrais 404 —
`alpha-eagle`, `aztec-twist` ne figurent plus sur leur site : ce sont les
orphelins que l'inventaire avait signalés le matin même (193 fiches chez nous
contre 144 chez eux). La campagne les saute, comme prévu.

## 2026-09-11 — Hacksaw capture enfin, et une option qui lançait le mauvais studio

Le catalogue compte 10 430 fiches et **245 sont prêtes**. Ajouter des noms ne
sert plus à rien : ce qui manque, ce sont les faits. Or la chaîne de capture ne
tournait que sur Pragmatic, alors que trois adaptateurs étaient écrits.

L'adaptateur Hacksaw était complet depuis des semaines et ne pouvait
matériellement pas aboutir, pour deux raisons qui ne lui appartenaient pas :

- **Le filtre de `demoUrl` était écrit en dur dans le runner**, sur
  `openGame.do` — le lanceur de Pragmatic. Hacksaw met en base l'adresse de sa
  page produit : le lot sortait vide, sans erreur. Le filtre appartient
  désormais à l'adaptateur (`demoExploitable`), et le runner dit combien de
  jeux il écarte et pourquoi.
- **Cloudflare refuse un Chromium sans tête** devant leur RGS de démo :
  `play/authenticate` part en `net::ERR_FAILED` et le jeu affiche « Connection
  lost to wallet ». L'adaptateur déclare maintenant `avecTete`, et le runner
  ouvre le navigateur en conséquence.

Premier jeu capturé de bout en bout : `2-wild-2-die`, RTP 96,25 lu dans le
panneau, dix captures.

### L'option qui lançait le mauvais studio

`--studio=hacksaw-gaming` ne rendait rien : ce script lisait la forme séparée
par une espace quand tous les autres lisent la forme collée. Le défaut
s'appliquait donc, et la campagne partait **sur Pragmatic** en l'annonçant dans
son journal — que personne ne relit ligne à ligne. Les deux écritures sont
acceptées. Une option ignorée doit rester impossible.

### L'interprétation sortie de l'OCR

Chaque studio a sa formule : Pragmatic écrit « The theoretical RTP of this game
is 96.07% », Hacksaw « Theoretical payout (RTP): 96.43% ». Exiger `RTP` juste
après le mot-clé rendait **null** sur un panneau parfaitement lisible. Idem
pour « Maximum achievable win » et pour « Volatility: High », dont l'ordre des
mots est inversé.

Vérifier ces formulations demandait jusqu'ici de fabriquer une image PNG et de
faire tourner Tesseract — donc personne ne le faisait, et une formule inconnue
ne se découvrait qu'en production, sous la forme d'un champ resté vide.
`extraireLesFaits(texte)` est maintenant une fonction pure, et treize tests
couvrent les formules des deux studios, le refus du RTP d'achat de bonus, les
bornes de vraisemblance et l'ordre « very high » avant « high ».

## 2026-09-11 — La bonne mesure n'est pas le nombre de fiches

Décision prise avec le propriétaire : **on ne court pas après les 52 513 jeux
de SlotCatalog.** Leurs 1 280 fournisseurs à 41 jeux de moyenne sont une longue
traîne de catalogues éteints ; publier des pages sur des studios disparus
n'apporte rien. Un studio mérite une place s'il est **vivant** — au moins un de
nos casinos partenaires le porte encore, et son site répond.

D'où `scripts/couverture-partenaires.ts`, qui répond à la seule question qui
décide du revenu : **un joueur qui ouvre un casino qu'on recommande y
trouve-t-il des jeux qu'on documente ?**

```
40 casinos actifs citent 245 fournisseurs (1 031 mentions)
80 studios en base, 10 430 fiches
  connus en base     80 fournisseurs    58 % des mentions
  absents           165 fournisseurs    42 % des mentions
```

Ce matin : 28 fournisseurs, 41 %. La mesure pondère par le nombre de casinos
qui portent chaque studio — un fournisseur présent chez trente partenaires pèse
trente fois celui qu'un seul distribue. **155 fournisseurs sous le seuil ne
pèsent que 31 % des mentions** : c'est la traîne, à traiter en dernier.

### Le devineur de domaines était le vrai goulot

111 studios sortaient en « aucun domaine plausible ne répond », ce qui se
lisait « studio mort ». C'était faux : six formes de domaine testées, presque
toutes en `.com`. Fantasma est `fantasmagames.com`, Peter & Sons
`peterandsonsgames.com`, Turbo Games `turbogames.io`. Douze formes plus tard,
onze catalogues rentrent — 476 fiches, dont Fantasma (159), King Midas (154) et
Peter & Sons (86).

### Encore deux racines refusées

Kalamba servait 537 pages à la racine : **des communiqués de presse**, comme BF
Games et High 5 avant lui — `partnership-agreed-with-wildz-casino`,
`news-round-up-04`. Et Jiliasia nomme ses pages en camelCase collé
(`papaiNoeldaFortuna.html`), d'où sortiraient des slugs illisibles : même motif
de refus que Relax Gaming. Sur dix racines rencontrées aujourd'hui, **sept
n'étaient pas des catalogues**.

## 2026-09-11 — Cinq catalogues sur huit étaient des communiqués de presse

Le prospecteur signale les studios qui servent leurs jeux sans préfixe d'URL —
`mascot.games/<slug>` plutôt que `/games/<slug>`. Huit cas, environ mille jeux
en attente derrière le drapeau `⚠ racine`. Ouverts un par un :

| studio | ce qu'il y avait vraiment |
|---|---|
| Mascot | 210 jeux ✓ |
| Backseat | 58 jeux ✓ |
| Gamebeat | des jeux, précédés de six pages de navigation |
| BF Games | **communiqués de presse** |
| Vivo | **communiqués de presse** |
| Fire Kirin | **blog et marketing** |
| Bluberi | **communiqués de presse** |
| High 5 Games | **communiqués de presse** |

Sans cette lecture, le catalogue aurait accueilli sept cents fiches nommées
`bf-games-enters-switzerland-with-gamanza-partnership`. D'où une **liste
nominative** (`RACINE_VALIDEE`) plutôt qu'un drapeau global : chaque entrée a
été ouverte. Et un filtre `PAGES_DE_SITE` écarte `about`, `careers`, `blog`,
`brandbook` — ce que Gamebeat sert au même niveau que ses machines.

### Le même studio sous deux noms, d'un rapport à l'autre

Nos casinos l'appellent `amigogaming`, SoftSwiss `amigo-gaming` : deux slugs,
un seul site. Le regroupement par domaine ne valait qu'à l'intérieur d'un
rapport ; la seconde prospection allait donc recréer trois studios de la
première. L'adoption confronte maintenant le domaine à ce que la base porte
déjà — `amigo-gaming`, `gaming-corps` et `revolver-gaming` ont été reconnus et
sautés.

Avec les 45 studios de SoftSwiss (Eyecon, Octoplay, Synot, CreedRoomz) et les
trois racines validées, le catalogue passe de 9 128 à **9 954 fiches**. Les 245
prêtes le sont toujours.

### Les agrégateurs, suite

SoftSwiss reste l'exception. Bragg, Pariplay, Relax, Oryx, GameArt, Hub88,
BetConstruct et Groove ne publient pas de liste de studios énumérable — au
mieux une poignée de partenaires mis en avant. Inutile d'y repasser.

## 2026-09-11 — 3 908 fiches de plus, et quatre pièges au passage

La prospection des 220 fournisseurs cités par nos casinos partenaires rend
**48 catalogues énumérables**. Après relecture, 39 sont adoptés : le catalogue
passe de 5 220 à **9 128 fiches**. Les 245 fiches prêtes le sont toujours.

### Ce que la relecture a arrêté

C'est pour ça que prospecter et adopter sont deux scripts. Aucun de ces cas
n'aurait échoué tout seul.

**EGT, 1 698 « jeux ».** Euro Games Technology est le parent industriel
d'Amusnet, et son catalogue est fait de bornes et de variantes par juridiction :
`rise-of-ra-gold-vlt-spain`, `panorama-roulette-double-zero-automatic-virtual-live`.
On ne peut y jouer depuis aucune page web — même motif que les `land-based`
d'Amusnet écartés le matin même.

**La locale prise pour un catalogue.** EGT sert `/ru/game/…` ×1702,
`/es/game/…` ×1027 et `/game/…` ×470 : le même catalogue six fois, et le russe
l'emportait au nombre. Le détecteur regroupe désormais les variantes qui ne
diffèrent que par un préfixe de langue et garde celle qui n'en a pas.

**`felix` et `felixgaming`** sont cités comme deux fournisseurs par nos
casinos. Les deux pistes tombent sur felixgaming.com. Sans regroupement par
domaine, la même société entrait deux fois avec 106 fiches chacune.

**La langue en paramètre d'URL.** Dragon Gaming publie
`/games/mythical-creatures/?lang=zh-hans`. Notre `slugDepuisUrl` prenait le
dernier segment — donc `?lang=zh-hans` — et **tous ses jeux traduits seraient
tombés sur un unique slug « lang-zh-hans »**. La requête et l'ancre sont
maintenant coupées avant lecture, et deux tests le verrouillent. Même correctif
pour les `.html` de Merkur et Push Gaming.

### Les collisions disent quelque chose

111 slugs étaient déjà pris. Une bonne part vient d'AvatarUX — `popnoir`,
`heliopopolis`, `zombie-apopalypse` — que Yggdrasil distribue et que nous
avions donc déjà sous Yggdrasil. Le garde-fou a eu raison de refuser : c'est un
seul jeu, il ne mérite qu'une page. Reste à trancher un jour qui, du créateur
ou du distributeur, doit porter la fiche.

### La piste MGA, et pourquoi on l'abandonne

Le registre des licenciés de la Malta Gaming Authority aurait donné une liste
officielle de studios avec leur numéro de licence — une donnée vérifiable que
les concurrents n'affichent pas. Mais le registre est une application dont le
bundle est **volontairement obscurci**, chaînes encodées en hexadécimal, et
tous les chemins d'API conventionnels rendent la coquille de l'application. En
tirer les données demanderait de désobscurcir leur code : on ne contourne pas.

La piste des agrégateurs, elle, est propre. SoftSwiss publie ses 146 studios
distribués dans un `gamevendor-sitemap.xml` dédié. Croisé avec nos 248, cela
donne **45 studios inconnus** — dont Games Global (l'ex-Microgaming) et
Greentube (le bras en ligne de Novomatic). Le croisement exige de couper les
suffixes de raison sociale : `blueprint-gaming` et `blueprint` sont le même
studio, et sans ça on comptait 66 nouveaux au lieu de 45.

## 2026-09-11 — Un prospecteur, parce qu'on ne peut pas écrire mille adaptateurs

Objectif fixé : porter le catalogue au niveau de SlotCatalog, qui annonce
**52 513 jeux de 1 280 fournisseurs** sur sa propre page « About Us ». On ne
copie pas leur base — leur sitemap est derrière un challenge Cloudflare, et
leur catalogue leur appartient. Les jeux, on les reconstruit depuis les sites
des studios.

À mille studios, écrire un adaptateur à la main coûte un mois. D'où
`scripts/prospecter-studios.ts` : on lui donne un nom de studio, il cherche son
domaine, lit son robots.txt, descend dans son sitemap et devine la famille
d'URL qui porte les jeux. Il rend un rapport et **n'écrit rien**.

`scripts/adopter-prospection.ts` fait l'autre moitié : il relit le sitemap
consigné dans le rapport, refiltre avec le motif retenu, crée le studio s'il
manque et les fiches WIP. Deux scripts plutôt qu'un, pour garder le point
d'arrêt où quelqu'un relit avant que la base bouge.

### Trois garde-fous, tous payés d'avance

**Le domaine parqué.** Un nom de studio est souvent un mot courant — `mascot`,
`platipus`, `tada`. Le .com correspondant appartient fréquemment à quelqu'un
d'autre. Le prospecteur exige donc qu'un mot du métier (slot, RTP, volatility,
jackpot…) figure sur la page d'accueil avant d'aller plus loin. Sans ça, on
aurait inventorié le catalogue d'une boutique de déguisements.

**Le plancher à quinze.** Premier jet : Playtech rendait « 10 jeux » sous
`/products/` et Amatic « 9 » — des pages d'offre commerciale B2B qui portent
par hasard un mot du métier. Un studio qui publie vraiment son catalogue en
aligne des dizaines. Sous quinze, on ne conclut pas.

**La racine.** Mascot sert ses jeux sans préfixe (`mascot.games/<slug>`, 211
pages) : exiger un dossier les rendait invisibles. On accepte la racine, mais
seulement au-delà de cinquante pages, et le rapport la marque `⚠ racine` —
`/about` et `/contact` y vivent aussi, une relecture s'impose avant d'en faire
des fiches.

### Ce qu'un échec raconte

Un studio manqué rend désormais les trois familles d'URL les plus peuplées de
son sitemap. `platipus → //… ×5` dit tout de suite que le catalogue est en
JavaScript et qu'aucun sitemap ne le portera ; `amatic → /products/… ×9` dit
que c'est une vitrine. Chaque échec devient une ligne d'adaptateur à écrire au
lieu d'une enquête à refaire.

## 2026-09-11 — Les 27 studios sont enfin tous rangés quelque part

Après les sept premiers, il restait douze studios ni inventoriés ni expliqués —
le pire des deux états, puisqu'un silence se lit « pas encore fait ». Cinq de
plus sont désormais automatisés (NetEnt 236, Red Tiger 355, Yggdrasil 571,
ELK 159, Big Time Gaming 90) et **1 275 fiches** rejoignent le catalogue, qui
passe de 3 945 à **5 220**. Les 245 fiches prêtes le sont toujours : aucune
nouvelle n'entre à l'index.

Le tableau couvre maintenant les 27 studios : **17 automatisés, 10 expliqués**,
zéro sans réponse.

### Deux adaptateurs écrits puis retirés

Ils marchaient. C'est le résultat qui ne valait rien.

- **Push Gaming** raccourcit ses URL en supprimant les petits mots :
  `mystery-mission-moon` pour « Mystery Mission To The Moon »,
  `land-zenith` pour « Land of Zenith », `grand-show` pour « The Grand Show ».
  La transformation n'est pas réversible. L'inventaire annonçait 11 manquants
  et 49 « chez nous seulement » sur 85 fiches : les créer aurait donné deux
  pages indexables pour un seul jeu, onze fois.
- **Relax Gaming** colle ses slugs sans séparateur
  (`/products/casino/moneytrain5`). On ne déduit pas « Money Train 5 » de ça.
  Leur titre est sur la page : une passe par fiche reste possible, l'inventaire
  en masse non.

Les deux rejoignent `SANS_SOURCE_AUTOMATISABLE` avec leur raison. Un adaptateur
qui produit un mauvais rapprochement est pire que pas d'adaptateur : il crée du
faux là où l'absence n'aurait rien créé.

### Le garde-fou des jumeaux

Big Time Gaming écrit `starquest`, notre fiche dit `star-quest`. Les deux slugs
sont libres, la création serait passée sans rien signaler — et le catalogue
aurait porté deux pages pour un seul jeu, enrichies à moitié chacune plus tard.
`inventorier-studios.ts` compare désormais les slugs **débarrassés de leurs
séparateurs** avant de créer, et signale au lieu d'écrire. Dès sa première
exécution il a attrapé deux cas : `star-quest`/`starquest` et
`hyperburst`/`hyper-burst` chez Yggdrasil.

### Ce qu'on ne sait pas faire, et pourquoi

| studio | obstacle |
|---|---|
| Blueprint | `Disallow: /` sur tout le site |
| Betsoft | aucun sitemap publié |
| Booming | domaine mort (ENOTFOUND) |
| Evolution | aucune page par jeu, seulement 9 marques |
| PG Soft | jeux identifiés par un numéro (`/games/201/`) |
| Playson | 403 sur robots.txt comme sur le sitemap |
| Spribe | sitemap vide |
| Push Gaming | URL raccourcies, non réversibles |
| Relax Gaming | slugs collés, nom non déductible |
| InOut Games | aucun `siteUrl` en base |

## 2026-09-11 — Sept studios inventoriés, trois qu'on ne peut pas inventorier

Dix studios stagnaient à exactement 6 fiches — 5 pour Booming, 4 pour Wazdan.
Aucun éditeur n'a six jeux : c'était un reste de seed, pas un catalogue. Sans
source pour les comparer, rien ne le signalait.

Sept adaptateurs d'inventaire plus tard, le catalogue passe de **2 462 à
3 945 fiches** (1 483 créées, 11 refusées pour collision de slug) :

| studio | publiés | chez nous avant |
|---|---|---|
| Amusnet | 281 | 6 |
| Evoplay | 270 | 6 |
| Wazdan | 263 | 4 |
| Endorphina | 234 | 6 |
| Habanero | 226 | 6 |
| Quickspin | 137 | 6 |
| Thunderkick | 117 | 6 |

Une fiche créée porte un slug, un nom déduit du slug et son studio. Rien
d'autre : `rtpConfiance` reste à `AUCUNE`, donc `estPublieable` est faux et
elles restent hors index et hors sitemap. Les 245 fiches prêtes le sont
toujours, aucune nouvelle n'est entrée.

**Trois studios n'ont pas d'inventaire automatisable**, et la raison décide de
la suite — d'où `SANS_SOURCE_AUTOMATISABLE`, qui les nomme au lieu de les
laisser dans un silence qu'on lirait « pas encore fait » :

- **Blueprint** sert `User-agent: * / Disallow: /`. Le site refuse
  l'exploration ; on ne passe pas outre, sa checklist se tiendra à la main.
- **Betsoft** ne publie aucun sitemap : `/sitemap.xml` rend la page d'accueil
  en HTML, et robots.txt n'en déclare pas.
- **Booming** : le domaine qu'on a en base ne résout plus (ENOTFOUND).

### Deux pièges, un cher

**Le CDATA.** Evoplay enveloppe ses `<loc>` dans `<![CDATA[…]]>`, la forme que
génère All in One SEO. Notre motif partagé `<loc>([^<]+)</loc>` butait sur le
`<` de `<![CDATA[` et rendait **zéro**. Rien n'échouait : un sitemap illisible
et un studio sans jeu rendent exactement le même compte. 270 jeux invisibles
derrière un succès apparent. Le motif accepte désormais les deux formes, et un
test le verrouille.

**L'identifiant interne.** Habanero nomme ses pages `SGBattleTheBeast` — `SG`
pour slot game, `TG` pour table game, puis le titre en CamelCase. La
normalisation commune en faisait `sgbattlethebeast` : son catalogue aurait été
compté deux fois, 226 manquants d'un côté et nos 6 fiches en « chez nous
seulement » de l'autre. D'où le crochet `slug?()` par studio, vérifié contre
nos fiches existantes : 5 sur 6 retombent juste, et la 6e révèle une vraie
divergence (`the-koi-gate` chez eux, `koi-gate` chez nous) — exactement ce que
la colonne est faite pour montrer.

**Amusnet range son catalogue en trois familles** et deux ne sont pas de notre
ressort : 58 bornes `land-based` auxquelles on ne peut pas jouer depuis une
page web, et 35 tables `live-casino` dont le modèle de faits est autre (pas de
panneau de règles, un gain maximum qui porte sur une case de mise). Les
compter aurait gonflé le dénominateur d'un tiers avec des jeux qu'on ne pourra
jamais sourcer.

## 2026-09-11 — Deux tables pour arrêter de deviner : les preuves et les casinos

Le site promet « Where to play Gates of Olympus » et répondait autre chose. Le
bloc « Où jouer » raisonnait au niveau du **studio** : il listait les casinos
qui portent du Pragmatic, pas ceux qui portent ce jeu-là. Une déduction servie
comme une réponse — exactement ce qu'on reproche aux agrégateurs.

Et un RTP juste sans sa preuve ne vaut pas plus qu'un RTP faux : `rtpSource`
était une seule chaîne de texte par jeu, incapable de porter la source du
gain maximum, de la volatilité ou de la grille.

Deux modèles répondent à ça :

- **`Preuve`** — une ligne par *champ* prouvé (`champ`, `valeurBrute`, `type`,
  `url`, `capture`, `verifieeLe`, `verifieePar`). L'énumération `TypeDeSource`
  classe la source par sa qualité : `REGLES_DU_JEU` (le jeu lui-même, le plus
  haut), `STUDIO`, `DEMO_OFFICIELLE`, `OPERATEUR`, `RECOUPEE`, `TIERCE`,
  `INCONNUE`. Un champ sans ligne de preuve est un champ non sourcé, et le dire
  est le but.
- **`DisponibiliteCasino`** — une ligne par (jeu, casino, pays), avec
  `PresenceJeu` (`CONFIRMEE`, `PROBABLE`, `ABSENTE`, `INCONNUE`) et le drapeau
  `jeuExactVerifie` : « ce casino porte du Pragmatic » et « ce casino porte
  *ce* jeu » ne sont pas la même affirmation.

Migration **purement additive** : 2 énumérations, 2 tables, 3 clés étrangères,
2 index, 1 index unique. Aucune colonne existante touchée, aucune donnée
supprimée — 2 462 jeux et 44 casinos vérifiés intacts après application.

**Le piège du jour.** `prisma db execute` envoie le fichier comme *une seule*
commande ; découper le script à la main pour l'appliquer ordre par ordre a
d'abord tout perdu, parce que chaque bloc commence par sa ligne `-- CreateEnum`
et qu'un filtre « ignorer les commentaires » les écartait tous. Le script
annonçait « 0/0 ordres appliqués » sans échouer. Passer par `db execute` avec
`DIRECT_DATABASE_URL` (5432, le pooler ne fait pas de DDL), puis relire
`information_schema` — jamais la sortie du script.

## 2026-09-10 — Du charabia d'OCR publié en titre sur 17 pages

Le titre d'une capture était retenu dès qu'une ligne du panneau était en
capitales, sans jamais vérifier que c'étaient des mots. L'OCR, lui, rend
volontiers des capitales sur du décor.

Résultat, en ligne, dans des intitulés visibles **et dans l'attribut `alt` des
images** — donc dans la surface SEO :

    Qganvie rullo · Ganic ruled · Mve nvlld · Et tet a · Tas attn fa vt
    4 t4 j tg · Livin rcell dvuinuvo · Itvividll tt lmt vinl · K 9 7 a xr fo
    Eapanding wild with multiplier

**25 titres sur 17 des 45 pages publiées.** Un titre n'est plus retenu que si
**chacun de ses mots** appartient au vocabulaire des en-têtes Pragmatic ; sinon
on retombe sur « Game rules, page N », qui a le mérite d'être vrai. Les chiffres
dans un en-tête sont refusés aussi : ils trahissent une ligne de contenu happée
au vol (« 25 free spins 20 free spins »), pas un intitulé de section.

Le sens de l'erreur est ce qui compte : un titre inventé se publie, un titre
refusé retombe sur un générique. On perd donc « Caishen random award », correct
mais rare — et c'est le seul faux positif sur les 45 jeux.

Les 45 fiches déjà en ligne ont été repassées au même filtre en base. Aucune
recapture nécessaire, et aucun build consommé : les fiches lisent Prisma.

## 2026-09-10 — Un troisième habillage Pragmatic, qui n'a pas de panneau

Les classiques historiques (888 Gold et sa famille) peignent leur table de
gains en permanence à côté des rouleaux, sous une barre de commandes grise.
L'engrenage n'ouvre que le son et le tour rapide : **il n'y a pas de panneau de
règles, et le RTP n'est affiché nulle part**.

Les confondre avec un échec de recherche les renvoyait en file à chaque
campagne, pour un rechargement complet et le même échec — alors que leur
capture de base contient déjà toute leur documentation. Ils sont maintenant
reconnus à leur barre de commandes et traités comme un résultat acquis :
capture de base publiée, aucun RTP inventé, plus de repassage.

⚠️ Attrapé en relisant : l'adaptateur renvoyait bien le cas, mais le script ne
le distinguait pas de zéro — la détection était donc restée sans effet.

## 2026-09-10 — Betti servait GB/DE/AU au lieu de la France

Correction en base, héritée de BetsRank. Là-bas, un commit de **rédaction** du
13/08 (`c7845348`, « 8 fiches éditoriales en 6 langues, rédaction menée par
7 agents en parallèle ») avait remplacé `['FR']` par `['GB', 'DE', 'AU']` sur
Betti, noyé dans un diff de 9 396 lignes.

where2spin a été semé depuis BetsRank **après** cet accident : il a donc
hérité de l'erreur sans que rien ne la signale. Le casino restait `actif`,
simplement proposé au mauvais public.

Les deux catalogues ont été confrontés entièrement dans la foulée — pays et
statut masqué/actif, marque par marque. **Aucun autre écart.** Betti était le
seul.

⚠️ Ce que ça dit du pont entre les deux sites : une erreur de données à
BetsRank se propage ici en silence au semis suivant. La confrontation
systématique vaut mieux que la confiance dans la source.

## 2026-09-11 — Un guide qui cite le catalogue, preuve à l'appui

Premier guide sur les jeux de table, dans les trois langues, et surtout un
mécanisme de maillage qui n'existait pas.

**Chaque section peut citer des fiches du catalogue.** La page va les chercher
en base et affiche leur nom, leur studio, leur RTP — **et son niveau de
preuve**. C'est ce qui distingue ce maillage d'un simple lien : l'affirmation
du paragraphe et la donnée sur laquelle elle repose tiennent dans le même
écran, et le lecteur vérifie d'un clic.

Servir le RTP sans sa preuve aurait donné la même autorité à une valeur lue
dans le panneau du jeu et à une valeur reprise ailleurs — précisément ce que
ce site reproche aux agrégateurs.

⚠️ **Ce que le chantier a révélé, et qui a changé le guide.** Les 45 jeux de
table du catalogue portent tous un RTP en `AUCUNE` : aucun n'est confirmé à la
source. Écrire « le blackjack rend 99,5 % » en s'appuyant dessus aurait été
exactement la faute que le site dénonce.

La prose n'affirme donc rien sur un jeu précis : elle explique le
**mécanisme** — pourquoi l'avantage d'une table découle de ses règles et non
d'un réglage, pourquoi les chiffres s'y regroupent alors qu'ils se dispersent
sur les machines, pourquoi la valeur du blackjack est un plafond et non une
espérance. De l'arithmétique, pas une donnée. Les chiffres, eux, sont dans la
liste, avec leur étiquette.

**Les guides deviennent multilingues**, avec l'anglais en repli. Un guide
traduit à moitié vaut mieux qu'un guide absent dans deux langues sur trois —
et le repli se voit, ce qui rappelle qu'il reste à traduire.

☑️ Les trois guides existants restent à traduire. ☑️ Les RTP des jeux de table
restent à confirmer à la source : Evolution et Pragmatic les publient.

## 2026-09-11 — Passe de traduction complète, et le layout racine réparé

**Le layout racine cassait le site.** Next 15 exige `<html>` et `<body>` dans
le layout **racine**, et mon passe-plat ne les portait pas. Le rendu serveur
répondait 200 — c'est ce qui m'avait trompé — mais le runtime client levait
« Missing `<html>` and `<body>` tags ».

La sortie n'était pas d'ajouter les balises à la racine : elle ne connaît pas
la langue, qui vit dans le segment. Il fallait **supprimer le layout et la
page racines** pour que celui du segment devienne le layout racine. La
redirection vers la langue par défaut part donc dans le middleware — mieux
placée d'ailleurs : `/catalogue` mène à `/en/catalogue` sans rendre de page.

**La première passe de traduction était superficielle.** Trente-huit chaînes
repérées par un grep rapide, et il en restait autant. Un extracteur qui ignore
les commentaires et couvre les attributs (`placeholder`, `aria-label`, `alt`)
autant que le texte a fait remonter le reste : métadonnées des sept pages de
section, accroches, libellés de filtres, pagination, page 404, états de
chargement.

Le compte final : **de 40 chaînes en dur à 2**, et ces deux-là sont le nom de
la marque et un fragment de code que l'extracteur confond avec du texte.

**Trois composants sont passés côté client** — page 404, bouton flottant,
champ de recherche. Aucun ne porte d'état, mais aucun ne reçoit de `params` :
une page 404 n'en a pas, et les deux autres sont montés depuis des pages qui
varient. Lire la langue dans l'URL était la seule voie qui ne demandait pas de
la faire descendre à travers toute l'arborescence.

⚠️ Détail attrapé au passage : le dictionnaire contenait `n\u2019est` — une
séquence d'échappement là où le caractère suffit. Ça compile et ça s'affiche
juste, mais c'est illisible à la relecture et ça casse les recherches
textuelles. Normalisé.

## 2026-09-10 — L'interface traduite, et le titre troué réparé

Trente-huit chaînes d'interface dans les trois langues : navigation, pied de
page, accroche, fiche de jeu. Un objet typé plutôt qu'une bibliothèque — à
cette échelle, le typage suffit et fait mieux : une clé oubliée dans une
langue casse la compilation.

**Le titre des fiches avait un trou, et il touchait un cinquième du
catalogue.** La formule unique donnait, sur les 512 fiches sans RTP :

    Where to play Gemix — RTP, demo and full specs

Une virgule après un mot vide. Deux gabarits valent mieux qu'un trou : celui
sans RTP nomme **le studio** à la place — c'est le fait dont on dispose, et il
distingue la fiche.

    Where to play Gemix by Play'n GO — free demo and specs
    Où jouer à Gemix de Play'n GO — démo gratuite et fiche
    Wo Gemix von Play'n GO spielen — Gratis-Demo und Daten

**Les liens de navigation portent une clé, pas un libellé.** Écrire « HOME »
dans le tableau des liens l'aurait figé en anglais dans les trois langues.

Le pied de page devient un composant client alors qu'il ne porte aucun état :
il ne contient que des liens et des intitulés, mais les deux doivent suivre la
langue. Le faire descendre en propriété depuis les huit pages qui l'affichent
coûterait plus cher que le kilo-octet de script que ça ajoute.

☑️ Reste hors de ce dictionnaire, et volontairement : les **données des jeux**.
Elles sont stockées en un seul exemplaire dans la fiche, et la table
`Traduction` existe pour porter leurs versions par langue. Les mélanger ferait
d'un dictionnaire d'interface un dictionnaire de contenu, qui grossirait sans
fin.

## 2026-09-10 — Le site passe en trois langues

Anglais, français, allemand. Le choix suit les marchés réellement couverts par
les casinos du panel — **21 en France, 12 en Allemagne**, et l'anglais pour
l'Australie et le Royaume-Uni réunis. Ouvrir l'italien ou l'espagnol pour deux
ou trois casinos reproduirait l'erreur que BetsRank paie déjà : 2 390 pages en
italien pour zéro casino.

**Le moment est choisi.** Rien n'est encore indexé. Les titres se changent
n'importe quand, les URL non : ajouter le multilingue après l'indexation
coûte des redirections et des `hreflang` à rattraper. Aujourd'hui ça ne coûte
rien.

**Un segment de langue dans l'URL, pas un cookie.** Les pages sont rendues
avec `revalidate`, donc mises en cache **par chemin**. Une langue choisie par
cookie, ou une réécriture vers le même chemin, ferait partager une seule
entrée de cache aux trois langues : la première rendue serait servie à tous,
et Google indexerait une langue au hasard. C'est le piège que le middleware
décrivait déjà pour le pays du visiteur.

**Les trois langues sont préfixées, anglais compris.** Laisser l'anglais à la
racine donnerait deux adresses pour la même page — `/` et `/en/` — donc du
contenu dupliqué à démêler avec des canoniques.

**Les slugs sont traduits, les noms propres non.** `/fr/favoris`,
`/de/katalog`, `/fr/avis` — mais `slot` reste `slot` : le segment est suivi du
studio et du jeu, et `/de/spielautomat/pragmatic-play/gates-of-olympus`
mélangerait une traduction et deux noms propres pour un gain nul. Comme 90 %
des pages sont des fiches de jeu, la table ne compte que sept entrées.

Le segment interne atteint en direct est **renvoyé en 301** vers le slug
traduit : `/fr/favorites` mène à `/fr/favoris`. Sans ça deux adresses
serviraient la même page.

**Chaque page déclare ses versions linguistiques**, dans son `<head>` et dans
le sitemap — 5 958 URLs, chacune avec ses trois sœurs et `x-default`. Sans
elles, trois pages qui se ressemblent se disputent le même classement et
Google en garde une seule.

⚠️ **`ACCOUNT` devient `FAVORITES`.** Il n'y a aucun compte sur ce site : pas
de connexion, rien. La nav annonçait « ACCOUNT », la page s'intitulait « My
games », et le contenu ce sont les slots enregistrés **sur l'appareil du
visiteur**. Trois choses différentes, dont une qui promettait ce qui n'existe
pas.

**Un composant `Lien` porte la langue à la place de tout le monde.** Les liens
internes étaient répartis dans seize fichiers, moitié serveur, moitié client :
faire descendre la langue en propriété jusqu'à chacun aurait touché toute
l'arborescence pour une information que l'URL porte déjà. `usePathname` étant
disponible au rendu serveur pour un composant client, l'adresse sort **déjà
complète dans le HTML** — un lien corrigé après hydratation serait suivi par
les moteurs dans sa version fausse.

⚠️ Les balises `<a>` internes ont été converties au passage : elles
provoquaient un rechargement complet **et** auraient perdu la langue.

☑️ L'interface reste en anglais dans les trois langues : douze chaînes en dur
à traduire. Les données des jeux, elles, sont stockées en un seul exemplaire —
la table `Traduction` existe pour ça et reste vide sur les 2 462 fiches.

## 2026-09-10 — Pragmatic inventorié : 697 jeux publiés, 634 chez nous

Cinquième adaptateur d'inventaire, et le plus gros studio du catalogue.

Son index mélange **huit sitemaps d'articles et onze de jeux**. On ne descend
que dans ceux qui portent les jeux : tirer les autres coûte dix-neuf requêtes
là où onze suffisent, pour un résultat identique.

**90 fiches créées.** Le catalogue passe de 2 372 à **2 462 fiches**, dont
512 encore sans RTP — hors index et hors sitemap tant qu'elles n'ont rien à
dire.

Deux collisions de slug de plus, et elles éclairent le problème : Pragmatic
publie un `baccarat` et un `multihand-blackjack`, déjà pris par Hacksaw et
BGaming. Ce sont des jeux de table aux noms génériques — le cas se
reproduira à chaque studio ajouté. `Jeu.slug` unique globalement n'est pas
tenable pour un catalogue multi-studios.

## 2026-09-10 — Le catalogue confronté à celui des studios

`checklist-catalogue.ts` dit ce qui manque **sur les fiches qu'on a**. Il ne
pouvait rien dire des jeux qu'on n'a pas : l'information n'est pas dans notre
base. `inventorier-studios.ts` va la chercher là où elle fait autorité — le
site du studio.

L'écart était plus large que prévu :

    studio          publiés  chez nous  manquants
    playn-go            417        180        254
    bgaming             343        227        121
    nolimit-city        143        136         15
    hacksaw-gaming      145        161         33

**337 fiches créées**, portant uniquement un slug, un nom déduit de l'URL et
leur studio. Aucun RTP, aucune volatilité : on ne sait rien de ces jeux, et le
seul fait honnête dont on dispose est qu'ils existent.

⚠️ **Le seuil de publication.** Ces fiches restent hors index et hors sitemap
tant qu'elles n'ont pas de RTP. Sans ça, on déclarait à Google des centaines
de pages vides d'un coup, et un site jugé sur la moyenne de ses pages perd le
classement de ses meilleures. Le critère est un champ, pas un drapeau : un
drapeau se pose à la main et s'oublie à la main, il finirait par mentir dans
les deux sens. Le seuil se lève tout seul dès qu'une fiche devient utile.

Le niveau de preuve n'entre pas dans ce calcul : une fiche au RTP non recoupé
est utile et le dit franchement à l'écran. C'est l'absence de donnée qui
disqualifie, pas la faiblesse de la source.

**Quatre studios, quatre stratégies, aucune généralisable :**

· BGaming expose un `game-sitemap.xml` dédié.
· Nolimit City passe par un **index** de sitemaps — sans descendre d'un
  niveau, on lit les URL des sous-sitemaps et on conclut qu'il ne publie
  aucun jeu. Il en liste 143.
· Play'n GO range ses jeux sous `/additional-game-content/`, pas sous
  `/games/` : le motif attendu rendait zéro sur un sitemap qui en contient 417.
· Hacksaw ne descend pas jusqu'aux jeux dans son sitemap ; c'est la page de
  listing qui les porte.

Le sitemap est préféré au listing partout où il existe : il est publié *pour*
être énuméré, complet par construction, et coûte une requête là où un listing
paginé en coûte cinquante.

⚠️ **`Jeu.slug` est unique globalement, pas par studio.** Deux éditeurs
publiant un jeu du même nom entrent en collision — `plinko` chez Hacksaw et
BGaming, `jogo-do-bicho` chez BGaming et InOut. Le script les signale au lieu
de les contourner : un slug pris est une question à trancher, pas un incident.
L'URL portant déjà le studio (`/slot/[studio]/[slug]`), l'unicité devrait
sans doute être `@@unique([studioId, slug])` — c'est une migration, elle
n'est pas prise ici.

## 2026-09-10 — Les 1 951 fiches déclaraient toutes l'accueil au partage

Next **fusionne** les métadonnées d'une page avec celles du layout racine. Un
`title` défini dans la page remplace bien celui du layout — mais un bloc
`openGraph` absent est hérité **en entier**. Aucune des pages qui déclaraient
leurs métadonnées n'écrivait ce bloc. Résultat, sur chaque fiche de jeu :

    og:title  →  where2spin — where to spin the slots you are looking for
    og:url    →  la page d'accueil
    og:image  →  la bannière générique du site

Le `<title>` et la `description`, eux, étaient bien uniques — c'est ce qui
rendait le défaut invisible en regardant l'onglet du navigateur.

**`og:url` est le plus grave des trois.** C'est le signal de canonique que
lisent les plateformes sociales : déclarer la même adresse sur 1 951 pages
revient à leur dire que ce sont toutes la même. Et tout lien de jeu partagé
s'affichait avec la vignette du site, quel que soit le jeu.

Un helper `metadonneesDePage` pose désormais titre, description, canonique et
bloc de partage d'un seul geste, sur les **neuf** pages concernées — fiche de
jeu, page studio, catalogue, guides et son index, démos, nouveautés, avis.
L'oubli était trop facile à refaire pour rester réparti dans neuf fichiers.

Deux choses que le passage a révélées au passage :

- **La page studio n'avait aucune canonique**, alors qu'elle est atteignable
  depuis le catalogue et la navigation avec des paramètres de pagination.
- **Omettre `images` ne rend pas la bannière du site, il ne rend rien.** Next
  ne fusionne pas les images dès lors que la page déclare son bloc. Le repli
  est donc explicite dans le helper, sinon la correction aurait supprimé la
  vignette des pages de section au lieu de la personnaliser.

Chaque fiche de jeu porte maintenant **son propre artwork** en image de
partage — 600×337, au-dessus du seuil des grandes cartes sociales (600×315),
et 1 855 jeux en ont un.

La version de l'URL de la bannière vit désormais à côté du repli, dans
`metadonnees.ts` : elle était écrite dans `layout.tsx`, et deux endroits pour
la même constante en font un qui sera oublié.

## 2026-09-10 — Le site s'appelle where2spin

`where2play.com` et `.net` sont pris, et le `.net` n'est pas dormant : c'est un
site vivant intitulé « Where-to-Play », dans le même créneau. Garder le nom
revenait à se disputer les recherches de marque avec un concurrent déjà
installé, sans jamais pouvoir récupérer le `.com`. Vérifié registre par
registre avant de trancher — `where2play.io`, `.gg` et `.co` étaient libres,
mais une extension technique pour un site grand public ne compense pas ça.

`where2spin` garde la construction « X2Y » : le « 2 » néon en tracé de circuit
et la machine à sous restent, seul le dernier mot change. Le domaine, le `.net`
et le `.io` étaient libres.

**Ce qui n'a délibérément pas suivi le nom : le préfixe `w2p-` des clickId.**

Le postback dérive la clé de la conversion du clickId, donc le préfixe est
inscrit dans la **clé primaire de chaque lead déjà enregistré**, à vie — là où
les clics, eux, expirent à 90 jours. Le renommer renverrait tout l'historique
du côté de BetsRank, dont le tableau de bord lit ce préfixe pour étiqueter
l'origine des leads.

Accepter les deux préfixes aurait été pire : ce fichier tient parce qu'il
énonce **une** règle, et une liste de cas particuliers se contourne par
distraction là où une règle unique ne se contourne pas. `w2p-` n'est donc plus
des initiales, c'est un identifiant — invisible du visiteur. Le raisonnement
est écrit en tête de `src/lib/tracking/click-id.ts`, pour que personne ne
« corrige » ça dans six mois.

⚠️ **Trois visuels épellent encore l'ancien nom** et doivent être regénérés :
`marque-w2p.webp` (le logo complet), `favicon.png` (« W2P » → « W2S ») et
`og.jpg` (1200×630). Le code, lui, est entièrement renommé.

⚠️ Rien à changer le jour où le domaine sera branché sur Vercel : `site.ts`
lit le domaine de production du projet et suivra tout seul.

## 2026-09-10 — La capture ne connaissait qu'un habillage sur deux

Trois défauts en cascade, tous du même genre : le script cliquait à une
position fixe et ne vérifiait jamais ce qu'il avait obtenu.

**Pragmatic sert deux habillages.** Le **large** (Gates of Olympus, 5 Lions
Dance) occupe toute la largeur, son icône « i » est à x=133 et son panneau de
règles est paginé à la flèche. L'**étroit** — les classiques à trois rouleaux —
cadre le jeu au centre sur ~400 px, l'icône suit le cadre (x=466 sur 777 Rush,
et la largeur varie d'un jeu à l'autre), et le panneau n'est pas paginé du
tout : il défile.

Ce que ça coûtait :

1. **L'icône cherchée à une coordonnée fixe** ratait tout l'habillage étroit en
   silence : sept captures du jeu de base. Le garde-fou les rejetait sans rien
   apprendre, donc ils revenaient échouer au lot suivant, indéfiniment.
2. **La flèche « suivant » cliquée sur l'habillage étroit** tombe hors du
   panneau — et le referme. La première capture était bonne, les six suivantes
   montraient le jeu de base.
3. **La boîte d'achat était capturée sur des jeux qui n'en ont pas**, et
   publiée sous la légende « Buying the feature » : une image du jeu de base
   présentée comme une confirmation d'achat, sur une machine sans tours
   gratuits.

L'adaptateur cherche donc l'icône en **vérifiant après chaque clic**, et la
position qui a marché lui dit lequel des deux habillages il a en face. Le
bouton d'achat est lu à l'écran avant d'être cliqué.

**Le nombre de crans a été mesuré, pas deviné.** Une sonde a compté ce qu'il
faut pour faire apparaître la ligne du RTP sur l'habillage étroit : **douze
crans de molette**. Sept s'arrêtaient juste avant — le jeu repartait sans son
RTP alors que le panneau était bien ouvert et que tout le reste marchait. On
descend maintenant cran par cran (18) mais on ne photographie qu'un cran sur
trois : dix-huit images quasi identiques sur une fiche n'ont aucun intérêt,
sept vues qui se suivent en ont.

**Les doublons sont écartés sur comparaison d'images**, et le seuil est
calibré. Une empreinte de l'image entière mentait dans les deux sens : le
panneau étroit n'occupant que 400 px sur 1280, une page entièrement différente
n'y pesait que 3,6 — sous le seuil, donc jetée avec le RTP ; et sur
l'habillage large une page légitime descendait à 6,6, à un cheveu du même
couperet. Recadrée sur la colonne centrale — la seule que les deux habillages
partagent — la mesure donne 15 à 40 pour un vrai changement de page contre 0,1
quand rien ne bouge.

Dernier détail, mais il pesait des heures : la détection lisait les 1280×800
par OCR à chaque position essayée, soit une quinzaine de secondes × 4
candidats × 619 jeux. Recadrée sur la bande où l'en-tête apparaît, elle coûte
quelques secondes.

⚠️ Le navigateur Playwright avait disparu du cache de la machine — c'est ce qui
faisait échouer la campagne au redémarrage. `npx playwright install chromium`.

## 2026-09-08 — Le site déclarait vivre à une adresse morte

`SITE_URL` valait `https://where2play.info` en dur. **Ce domaine ne résout
pas.** Le site annonçait donc à Google que ses 1 987 URLs de sitemap, ses
canoniques et ses données structurées pointaient vers un hôte inexistant.

L'absence d'aperçu au partage n'était que le symptôme visible : les réseaux
sociaux allaient chercher `og:image` sur ce même domaine mort. Le problème de
fond était l'indexation.

L'adresse se déduit désormais de l'environnement, et **se corrige toute seule** :
Vercel renseigne `VERCEL_PROJECT_PRODUCTION_URL` avec le domaine de production
du projet — l'adresse `.vercel.app` tant qu'aucun domaine n'est branché, puis le
domaine personnalisé dès qu'il l'est. Rien à changer ce jour-là. Un
`NEXT_PUBLIC_SITE_URL` explicite garde la priorité si besoin.

Le repli local passe de `where2play.info` à `localhost:3000` : en
développement, aucune autre adresse n'est atteignable, et pointer vers un
domaine qu'on ne contrôle pas encore n'aide personne.


## 2026-09-08 — Chaîne de capture : lire les faits dans le jeu lui-même

598 jeux Pragmatic ont désormais leur **vraie URL de démo**, extraite du
`data-game-src` de la fiche produit. Le champ `demoUrl` contenait jusqu'ici la
page de présentation du studio : le bouton « démo » tenait sa promesse à
l'inspection et la trahissait à l'usage.

**Le RTP se lit dans l'image, faute de mieux — et c'est mieux qu'il n'y paraît.**
Trois voies ont été essayées et écartées avant d'en arriver là :

- **Le réseau** ne transporte que les gabarits de phrase
  (`"The theoretical RTP of this game is {0}%"`), jamais la valeur.
- **Le graphe de scène** est inaccessible : le jeu tourne dans une iframe et
  n'expose aucun global portant un `stage`.
- **`logo_info.js`** publie bien des RTP, mais tous suffixés `_cv` : ce sont
  les paliers opérateur, pas le défaut studio.

Reste le panneau de règles. Ce n'est pas un pis-aller : c'est la seule chose que
le studio affiche vraiment au joueur, donc la seule qu'on puisse citer.
L'OCR en tire le RTP, les mises minimale et maximale, la volatilité **annoncée
par le studio**, le gain maximum et sa fréquence.

**Ce qui est refusé.** Chaque valeur est bornée à ce qui est physiquement
possible, et une lecture hors bornes est jetée plutôt que corrigée. Un « 96.50 »
lu « 9650 » deviendrait une donnée fausse publiée **en source studio**, soit le
pire résultat possible sur ce site.

**Deux formulations, et un piège de ponctuation.** Le même studio écrit tantôt
« The theoretical RTP of this game is 96.00% », tantôt « The maximum RTP of
this game is 96.03% » suivi d'un minimum — une **plage**, qui correspond à
`rtpStudio` + `rtpPaliers`. Et le panneau annonce aussi le RTP « when using
BUY FREE SPINS », un autre mode de jeu. Une première version découpait le texte
en phrases pour l'écarter : elle effaçait tout, l'OCR ne restituant aucun point.
On s'appuie donc sur la formulation — « of **this game** is » contre « when
**using** » — qui distingue les deux sans ponctuation.

**L'écran d'accueil : la touche Espace, après trois erreurs.** Un clic à
position fixe échouait un jeu sur deux — le bouton de lancement se déplace
selon la mise en page. Six positions essayées dès la 22ᵉ seconde n'ont rien
changé : le problème n'était pas *où* cliquer mais *quand*, ces jeux mettant
plus de 22 s à charger. Une détection de l'accueil par OCR pour attendre le bon
moment n'a rien lu non plus — son texte est décoratif, courbé, ombré, et le
moteur en tire « TO START (UU », là où le panneau de règles se lit
parfaitement.

La réponse était écrite dans le panneau lui-même : « SPACE and ENTER buttons on
the keyboard can be used to start and stop the spin. » Le gros bouton rond de
l'accueil **n'est pas cliquable** — c'est une illustration dans la phrase
« PRESS ⟳ TO START PLAYING! ». Vérifié à l'écran avant d'y croire.

**Un jeu dont le panneau ne s'est pas ouvert n'est pas marqué comme fait.**
Sans ce contrôle, il produisait neuf captures de son carrousel d'accueil,
publiées comme documentation et jamais réessayées. Le mot « RTP » ne figure que
dans le panneau : sa présence prouve qu'on y est entré. Le jeu reste en file
sinon — la reprise devient automatique.

**Ancienne note conservée :** Un clic à position fixe
échouait un jeu sur deux : le bouton de lancement se déplace selon la mise en
page. Six positions essayées dès la 22ᵉ seconde n'ont rien changé — le vrai
problème n'était pas *où* cliquer mais *quand* : ces jeux mettent plus de 22 s
à charger et n'écoutent pas les clics avant. L'ordre correct est d'**attendre
que l'accueil apparaisse**, sa présence prouvant que le jeu écoute, puis de
cliquer jusqu'à ce qu'il disparaisse. On n'attend pas une durée, on attend un
état.

**Chaque jeu est publié dès qu'il est prêt**, et non à la fin du lot. La
première version capturait les quarante jeux, puis téléversait, puis écrivait :
une coupure à la trente-neuvième perdait quarante minutes — et sur les 592 jeux
restants, dix heures. Un traitement long doit être interruptible sans perte,
parce qu'on l'interrompt toujours. Le champ `capturesLe` sert de marque-page.

Les captures vivent en base (`jeux.captures`, colonne JSON) plutôt qu'en
fichier statique : à 598 jeux et neuf captures chacun, publier une image ne doit
pas demander un commit.

**Marque :** favicon « W2P » — les trois lettres se lisent à 24 px, ce que
l'emblème ne pouvait pas : un dessin détaillé réduit à 16 px devient une tache,
quelle que soit sa qualité.

Le fichier fourni portait un **halo pâle opaque sur 14 % de sa surface** — le
rendu du néon aplati sur un fond clair, puis partiellement détouré. Invisible
sur blanc, il serait apparu comme une salissure grise sur l'onglet sombre d'un
navigateur. Il est effacé en dégradé, en visant ce qui est **à la fois clair et
désaturé** : les lettres sont soit très colorées, soit très sombres, donc
épargnées. Un seuil net aurait laissé un contour découpé à la place du halo.

Icône Apple sur fond sombre de la charte — ce format ne supporte pas la
transparence et l'aurait remplie de blanc.

Image de partage social au format 1200×630, image de partage social
au format 1200×630. La balise `og:image` n'est émise que si le fichier existe —
une balise pointant vers une 404 est pire que pas de balise, les réseaux
mettant l'échec en cache longtemps après l'arrivée du fichier.


## 2026-09-08 — Débordement mobile, et trois partenaires retirés

**La fiche de jeu débordait de 50 px sur iPhone** — 440 px de large dans une
fenêtre de 390. La cause n'était pas ce qui dépassait à l'écran : un élément de
grille a , il refuse donc de descendre sous la largeur
minimale de son contenu. Un seul descendant large — ici les lignes de
partenaires, qui alignent un logo de 96 px, un nom et un bouton — suffit à
élargir **toute la colonne**, et le site entier se met à défiler latéralement.

Corrigé par  sur les colonnes et  sur les
grilles imbriquées. Les neuf pages du site mesurent désormais exactement la
largeur de la fenêtre à 390 px.

**Hermes, Europe777 et Staxino passent inactifs** : les accords ne sont pas
renouvelés. Les laisser visibles enverrait du trafic vers des partenaires qui
ne rémunèrent plus — chaque clic est une perte sèche.

## 2026-09-08 — Débordement mobile, et trois partenaires retirés

**La fiche de jeu débordait de 50 px sur iPhone** — 440 px de large dans une
fenêtre de 390. La cause n'était pas ce qui dépassait à l'écran : un élément de
grille porte `min-width: auto`, il refuse donc de descendre sous la largeur
minimale de son contenu. Un seul descendant large — ici les lignes de
partenaires, qui alignent un logo de 96 px, un nom et un bouton — suffit à
élargir **toute la colonne**, et le site entier se met à défiler latéralement.

Corrigé par `min-w-0` sur les colonnes et `grid-cols-[minmax(0,1fr)]` sur les
grilles imbriquées. Les neuf pages du site mesurent désormais exactement la
largeur de la fenêtre à 390 px, vérifié en émulation iPhone et non à la fenêtre
redimensionnée — Chromium sans tête impose un minimum de 500 px, ce qui masque
précisément ce défaut.

**Hermes, Europe777 et Staxino passent inactifs** : les accords ne sont pas
renouvelés. Les laisser visibles enverrait du trafic vers des partenaires qui
ne rémunèrent plus — chaque clic est une perte sèche.

## 2026-09-08 — Le logo du studio sur la fiche, et deux logos illisibles

**Le logo du studio ouvre le panneau de données**, à 56 px — la première
version à 36 px se lisait comme une vignette décorative plutôt que comme une
signature. Le nom figurait déjà en
ligne « PROVIDER » — le logo ne le double pas : il se reconnaît avant d'être
lu, et sur une fiche dont l'argument est la provenance des données, dire de qui
elles viennent avant de les donner n'est pas décoratif.

**Le pied de page porte le logo au lieu du mot-marque en texte.** L'en-tête
portait déjà l'image ; garder une version typographique en bas donnait deux
traitements de la même marque sur une seule page — l'un soigné, l'autre
approximatif.

**Un audit des 25 logos en a révélé deux illisibles**, et ils n'étaient pas
passés par la garde de luminance parce qu'ils venaient du premier import,
antérieur à elle :

- **Big Time Gaming** (médiane 54) : leur site publie une version blanche
  officielle, reprise telle quelle.
- **Nolimit City** (médiane 2) : logo **polychrome** — 62 % de noir, 10 % de
  blanc, 9 % de jaune. Le recolorer en blanc, comme on l'a fait pour Wazdan,
  aurait détruit le dessin en fondant deux couleurs sur trois. Il est donc
  posé sur une **plaque claire**, ce qui préserve exactement sa marque. C'est
  le traitement que les chartes des studios prévoient elles-mêmes pour ce cas,
  et il vaut mieux qu'un logo réinventé ou absent.

## 2026-09-08 — Les captures s'agrandissent au clic

Les captures les plus utiles sont les panneaux de règles : table de gains,
plage de multiplicateurs, RTP. Dans une grille à deux colonnes, ce texte fait
quatre pixels de haut — l'image est là mais elle ne se lit pas, et une capture
illisible ne documente rien, elle décore.

Fermeture par Échap, par le fond, ou par un bouton visible : les trois, parce
qu'un visiteur qui ne trouve pas comment refermer une image plein écran quitte
la page. Flèches gauche et droite pour parcourir les sept pages sans refermer.

**Deux pièges CSS, tous deux invisibles au typecheck :**

- **Le `clip-path` du panneau rognait la visionneuse.** Un `clip-path` rogne
  ses descendants **y compris ceux en `position: fixed`** — la visionneuse
  s'ouvrait tronquée à l'intérieur du panneau au lieu de couvrir l'écran. Le
  même piège existe avec `filter` et `transform`, qui redéfinissent le bloc
  conteneur d'un élément fixe. La seule issue est de sortir du sous-arbre :
  un portail vers `body`.
- **`bg-black/92` ne produisait aucun fond.** Une opacité arbitraire ne sort
  du générateur Tailwind que si elle figure telle quelle dans le source. La
  page se lisait donc derrière l'image. Le voile est désormais posé en style,
  et **opaque** : à 95 % la grille continuait de transparaître sous le panneau
  qu'on venait d'ouvrir pour le lire.

## 2026-09-08 — Les captures passent chez Supabase Storage

Bucket public `captures`, limité au WebP/PNG/JPEG et à 5 Mo par fichier. Les
neuf captures de Gates of Olympus y sont, la fiche les sert depuis là, et le
dépôt ne les porte plus.

**Pourquoi pas dans Git.** Six captures pèsent 1 Mo en WebP ; sur 1 951 jeux
l'ordre de grandeur est de 1,7 Go. Git garde chaque version d'un binaire dans
l'historique pour toujours — un dépôt qu'on ne peut plus cloner est un dépôt
perdu. Les jaquettes (54 Mo) passaient encore ; les captures, non.

**L'URL de base est une constante, pas une variable d'environnement.** Elle
apparaît telle quelle dans chaque image servie au visiteur : elle n'a rien d'un
secret. En faire une variable ajouterait une façon de casser la production —
variable oubliée sur Vercel, et toutes les captures tombent en 404 — pour
protéger ce qui est déjà public. Seul le téléversement demande la clé, et il
tourne en local.

`x-upsert` est actif : relancer une capture remplace l'ancienne au lieu
d'échouer. Sans ça, corriger une image demanderait une suppression manuelle —
et on finirait par ne plus corriger.

## 2026-09-08 — Les partenaires passent après la documentation

La liste des casinos était placée juste sous le visuel : le visiteur tombait
sur huit boutons « Play » avant d'avoir lu une seule information sur le jeu.
C'est l'ordre d'un comparateur, pas celui d'une fiche — et il dessert les deux,
parce qu'un lecteur sollicité avant d'être renseigné ne clique pas.

On documente d'abord, on oriente ensuite.

## 2026-09-08 — Captures dans la démo : la preuve tient dans le jeu

Six captures faites dans la démo officielle de Pragmatic Play sur Gates of
Olympus — jeu de base, table de gains, mécanique de tumble, règles des tours
gratuits, panneau de RTP, achat de bonus — affichées sur la fiche avec leurs
légendes et **la date de capture**.

**La trouvaille n'était pas celle qu'on cherchait.** On visait des visuels
originaux ; on a trouvé une **source primaire**. Le panneau de règles affiche
« The theoretical RTP of the game is 96.50% », puis le même chiffre avec l'ante
bet et avec l'achat de bonus. C'est le jeu lui-même qui parle — meilleur qu'un
communiqué, et impossible à contester. Gates of Olympus passe donc de
« non vérifié » à **STUDIO-VERIFIED**, sa source étant le panneau lui-même.

**Comment on y accède.** La fiche produit du studio contient l'URL de démo
réelle dans un attribut `data-game-src`, avec le `gameSymbol` du jeu — donc
extractible. Le champ `demoUrl` de la base, lui, contient aujourd'hui la fiche
produit, pas la démo : le bouton « démo » des fiches renvoie vers une page de
présentation, ce qui reste à corriger.

**Ce que les légendes ne font pas.** Elles ne transcrivent pas les valeurs de
symboles ligne à ligne. Recopier vingt-sept petits nombres lus dans une image
est exactement la manière dont une erreur entre dans une fiche — et le site est
construit sur l'idée inverse. La capture montre, le texte résume ce qui est
écrit en gros : RTP, mises minimale et maximale, plage de multiplicateurs, coût
de l'achat.

**Coût mesuré, pour décider de la suite.** Six captures pèsent 1 Mo en WebP
(27 Mo en PNG). Sur 1 951 jeux, l'ordre de grandeur est de 1,7 Go — hors du
dépôt Git, donc à ranger dans un stockage objet avant toute industrialisation.

## 2026-09-08 — Le nom du jeu sur les vignettes

Conséquence directe du recadrage : les 15 % coupés en haut sont très souvent
l'endroit où le studio place le titre. Beaucoup de jaquettes ne montrent plus
que le décor — et « la voiture violette » ne se cherche pas dans un catalogue.

Le nom n'est donc pas un doublon de l'image : **il la remplace là où elle ne
dit plus rien**. Deux lignes au maximum, hauteur fixe — sans elle, un titre
long et un titre court donnent deux cartes de tailles différentes et la grille
se désaligne.

La zone d'image passe de 16/10 à 16/9, le format réel des jaquettes recadrées :
en 16/10 elles étaient encadrées de bandes noires en haut et en bas, ce qui
faisait paraître le recadrage comme un défaut d'affichage.

## 2026-09-08 — Les jaquettes : 35 % → 95 %, et cinq détecteurs abandonnés

**1 855 jeux sur 1 951 ont désormais une jaquette**, contre 692 au départ.
Aucune ne porte le filigrane d'un concurrent — vérifié, pas supposé.

**Cinq détecteurs successifs, et pourquoi chacun a échoué.** Le calque
« SlotCatalog.com » existe à plusieurs échelles, sur des fonds clairs comme
sombres, et l'artwork des jeux contient lui-même du vert.

1. **Par la taille de l'image** : « au-delà de 400 px, c'est filigrané ». Faux
   dans les deux sens — `bonanza.webp` fait 480 px et est propre, `fruits.webp`
   porte le calque à 600×600 quand `aztec-twist.webp`, même dimension, ne l'a
   pas. Ce tri jetait mille images utilisables.
2. **Par le vert dans une boîte en pixels fixes** : séparation parfaite sur
   quinze images, puis un filigrane d'une autre échelle est passé à côté de la
   boîte.
3. **Par la teinte exacte du vert** : `booze-bash` porte un disque vert dans
   son artwork et sortait à 23 %, quand un vrai filigrane sur fond clair
   tombait à 0,5 %.
4. **Par la signature blanc-puis-vert** : le score, dilué sur toute la bande,
   plaçait de vrais filigranes à 1,4 sous une image propre à 1,27.
5. **Par la géométrie du mot sur bande glissante** : quinze détections sur
   quinze — et deux ratés sur douze images prises au hasard.

**Le problème n'était pas le réglage.** On cherchait à *reconnaître* une chose
dont on connaît déjà la position. Le calque est toujours ancré en haut à
gauche et ne descend jamais au-delà de 15 % de la hauteur : on le supprime en
**recadrant**, ce qui ne demande de reconnaître rien du tout. Le prix est une
bande de fond en haut de la jaquette ; le gain est double — plus aucun
filigrane possible, et les 652 images qu'on écartait par précaution
redeviennent utilisables.

**Ce que la vérification a révélé au passage :** 134 jaquettes filigranées
étaient déjà publiées, dont plusieurs du lot d'amorçage. Le site affichait la
marque d'un concurrent depuis le début, et aucun tri par la taille ne pouvait
le voir.

Le détecteur survit comme **filet de contrôle** : il a signalé 19 images après
le recadrage, dont une vraie (le bas du calque avait survécu à la coupe). Deux
recoupes ont ramené le compte à trois, supprimées — trois jaquettes sur 1 858
contre la garantie de ne rien publier, l'échange est évident.

## 2026-09-08 — Les derniers logos, et une garde qui se faisait avoir

Trois logos de plus depuis les sites officiels : Endorphina (SVG 1983×908),
BGaming (SVG) et Play'n GO. **25 studios sur 27** en portent un.

**Le contrôle de luminance s'est fait avoir, et c'est le plus instructif.**
Il calculait la luminance *moyenne* des pixels opaques. Le logo BGaming est un
mot en noir accompagné d'un petit carré jaune vif : minoritaire en surface,
très lumineux, le jaune tirait la moyenne à 91 — au-dessus du seuil — alors que
les neuf dixièmes du dessin étaient invisibles sur fond noir. Le logo est passé,
et seule une vérification à l'œil l'a rattrapé.

Un contrôle qu'un seul détail suffit à tromper ne protège de rien. Il raisonne
maintenant sur la **médiane**, qui décrit ce que l'œil voit : si plus de la
moitié du tracé est sombre, le logo est sombre, quel que soit l'éclat du reste.
Le passage à la médiane a aussi révélé que Play'n GO était à 70 pile — la
moyenne le surévaluait sans qu'on le sache.

BGaming n'a que deux couleurs, sept tracés noirs et sept jaunes : le noir est
passé en blanc, ce qui donne la version inversée du logo sans toucher ni à sa
forme ni à son jaune de marque.

**Deux studios restent sans logo, et c'est un choix.** Booming Games bloque
toute lecture automatisée de son site ; Playson ne sert qu'une coquille
JavaScript. Habanero expose bien une icône, mais elle fait 94 px et ne montre
qu'un écusson sans le nom : agrandie à la toile de 400 px elle serait molle, et
un « H » seul dans une liste dont le but est d'identifier un fournisseur ne
remplit pas sa fonction. Le nom en texte fait mieux que l'image.

## 2026-09-08 — La conduite passe derrière le logo

Elle **commençait** à droite du logo, en biseau. Résultat : un trait qui naît
au milieu de la page et ne vient de nulle part — il avait l'air sectionné.

Elle vient maintenant du bord gauche, à un niveau plus bas, passe derrière le
dessin (qui est en `z-10`, donc au-dessus) et remonte à 45° une fois dépassé.
C'est le logo qui l'interrompt, pas elle qui s'arrête — et la différence se
voit immédiatement, même sans savoir la nommer.

Les trois lignes descendent à des hauteurs différentes (13, 16, 19 px) : un
niveau bas commun les aurait fondues en un seul trait sous le logo, et le
faisceau se serait reconstitué en sortant, comme sorti de nulle part.

## 2026-09-08 — La bande de tracés disparaît de l'en-tête

Les deux motifs de circuit imprimé aux coins du bandeau sont supprimés.

Ils venaient de la maquette, où le logo n'était qu'un emblème simple. Le logo
actuel **porte déjà son propre décor de circuit** : deux motifs du même
vocabulaire, à vingt pixels l'un de l'autre, se disputaient l'attention au lieu
de s'additionner. Ce n'est pas une question de surcharge — c'est que le second
rendait le premier moins lisible, donc moins efficace.

Effet utile : le bandeau se resserre de 17 px, ce qui remonte le logo d'autant
sans qu'il faille toucher à sa taille.

`TraceCircuit` n'était appelé que là. Le composant est supprimé plutôt que
laissé en réserve : un décor orphelin dans un fichier de charte est un décor
que personne ne saura plus pourquoi il existe.

## 2026-09-08 — Le logo complet, et la conduite qui s'écarte

Le nouveau fichier porte son propre mot-marque : le « where2play.info » en HTML
qui l'accompagnait affichait donc **la marque deux fois, dans deux
typographies différentes**. Il est retiré.

Le logo déborde volontairement sous le bandeau (`-mb-[46px]`). Le garder entier
dans la hauteur de l'en-tête aurait imposé de l'épaissir de 45 px ou de réduire
le logo — c'est la conduite qui s'écarte : elle démarre **après** lui, attaquée
par un biseau à 45° qui monte depuis le bas du bandeau, comme si le trait
sortait de derrière le dessin.

**Pourquoi ce départ ne pouvait pas être écrit dans le SVG.** `Conduite` est
étirée en `preserveAspectRatio="none"` : ses coordonnées sont proportionnelles
à la largeur de la fenêtre, alors que le logo occupe une largeur fixe en
pixels. Un départ à « 143 unités sur 1200 » collerait au logo à 1440 px de
large et le laisserait à 70 px de lui à 1920 — l'écart grandirait avec l'écran
sans que rien ne le signale. Le décalage est donc appliqué en pixels sur le
conteneur, et le biseau dessiné en segments CSS à longueur fixe.

## 2026-09-08 — Le sitemap survit à une base injoignable

Le premier déploiement Vercel a échoué sur `/sitemap.xml` :
`Can't reach database server at 127.0.0.1:5432`. Sans `DATABASE_URL` dans
l'environnement, Prisma retombe sur localhost, la requête lève pendant le
build, et **tout le déploiement s'arrête** — le site entier reste hors ligne à
cause d'une route annexe.

La base injoignable produit désormais un sitemap réduit aux pages fixes, avec
un avertissement explicite dans le journal de build. Les fiches y reviennent à
la première revalidation.

Ce repli ne remplace pas la configuration : sans la variable, les pages de jeux
n'ont rien à afficher au runtime non plus. Il évite seulement qu'une variable
oubliée se traduise par un site absent plutôt que par un message lisible.

## 2026-09-08 — L'emblème remplace le logo tracé

Le logo livré est un **lockup** : emblème néon, mot-marque et baseline « SLOT
REVIEW & GUIDES ». Seul l'emblème est découpé et intégré à l'en-tête.

À la hauteur d'un bandeau (50 px), la baseline du lockup ferait 4 px de haut :
illisible, et elle salirait le bloc au lieu de l'informer. Le mot-marque reste
donc du **texte HTML** — net à toute taille, sélectionnable, lu par les moteurs
— et l'image n'apporte que ce qu'un tracé ne sait pas faire.

Le découpage garde son rapport 1,41:1 : forcer un carré aurait ajouté des
marges transparentes et rétréci le dessin d'autant.

Le tracé SVG fait à la main disparaît. Il tenait la place en attendant, et
c'était sa seule fonction.

## 2026-09-08 — Logos officiels et vitrine des titres connus

**Dix logos récupérés sur les sites des studios**, ce qui porte la couverture
de 17 à 24 sur 27. Sept étaient en basse définition réelle (Play'n GO, PG Soft,
BGaming, Playson, Relax, ELK, InOut) : quatre ont désormais leur fichier
officiel, en SVG pour la plupart.

Les SVG sont **rasterisés à haute densité, pas redimensionnés** : lu à sa
densité par défaut, un SVG donne parfois 198×24 px, et l'agrandir ensuite
produit exactement le flou qu'on voulait éviter. En imposant la densité au
décodage, le tracé est rendu à la taille finale, donc net par construction.

**Le garde-fou de luminance a servi dès le premier passage.** Un logo sombre
disparaît sur fond noir sans que rien ne le signale — la case paraît
simplement vide. Le script mesure la luminance moyenne des pixels opaques et
refuse d'écrire en dessous de 70. Wazdan publie son logo en `#191919`
(luminance 25), sa version de pied de page aussi. Le tracé étant monochrome —
une forme, une couleur — il a été recoloré en blanc, l'usage normal d'une
marque sur fond sombre. Un logo polychrome serait resté écarté : on ne
réinvente pas les couleurs d'un partenaire.

**La vitrine montre enfin les titres que le public cherche.** Elle était triée
par niveau de preuve puis alphabétiquement, un jeu par studio : ça montrait la
*couverture* du catalogue — Annihilator, Cygnus 2, Dead Canary — et aucun des
titres pour lesquels les gens arrivent. L'accueil n'a pas à démontrer
l'étendue, il a à faire reconnaître quelque chose en une seconde.

Aucun critère en base ne peut produire cette liste : ni le RTP, ni la date, ni
le nombre de casinos ne disent qu'un jeu est célèbre, et le volume de recherche
n'est pas dans nos données. D'où une liste écrite à la main — la solution
honnête, à condition d'être maintenue. Le complément garde la règle d'un titre
par studio, pour que la rangée reste variée si la liste se vide.

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
