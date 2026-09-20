# Carnet de bord — where2spin

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

## 2026-09-20 (2) — le studio publie la structure, et ça vaut mieux que de la lire à l'écran

**Ce qu'on a compris cette nuit.** Compter les lampes de part et d'autre d'une
grille Wazdan ne dit pas le nombre de lignes : le studio utilise **trois
conventions** et seuls les numéros les distinguent — 1→5 des deux côtés
(miroir, 5 lignes), 1→10 à gauche et 11→20 à droite (20 lignes), impairs à
gauche et pairs à droite (10 lignes). 33 valeurs lues « 10 » ont donc été
**retirées** : dans la même série, `hot-slot-777-gold-crown` a 10 lignes et
`hot-slot-777-rubies` en a 20. Les preuves sont annotées, pas supprimées.

**La sortie n'était pas une meilleure lecture d'image, c'était une autre
source.** Les studios publient la structure sur la fiche produit de chaque jeu,
et la base porte déjà l'adresse de ces fiches dans `rtpSource`, héritée de la
campagne RTP de septembre. `scripts/moissonner-specs-studio.ts` les relit :
- **Endorphina** (`Reels and Rows: 5x3` + `Lines`) — **216 grilles et 217
  lignes**, sur des jeux qu'on ne peut pas capturer depuis la France ;
- **Wazdan** (`Reels / Lines`) — 172 lignes ;
- **Amusnet** (`Reels` + `Reels position` + `Paylines`) ;
- **Red Tiger et NetEnt**, qui partagent la plateforme d'Evolution et exposent
  un bloc JSON `"rowsReels":"5x3"` / `"playLinesMax"` / `"winType"` — 537 fiches
  dont aucune n'est capturable d'ici ;
- **Spinomenal** (`<td>Paylines</td>`), qui complète les cabinets « hold & hit »
  restés muets à l'écran.

**La règle de priorité, payée deux fois :** la fiche produit ne remplit que les
champs **vides**. Sur Black Hawk Deluxe, l'épée du décor affiche « 27 WIN
LINES » quand la fiche produit dit 54 — **Wazdan recopie les specs du jeu de
base sur ses variantes Deluxe**. Le panneau du jeu gagne, toujours.

Deux autres pièges de lecture : sur la série « Coins », le studio écrit le
nombre de **cases** là où on attend des rouleaux (« 12 Coins » = « 12 / 0 »
pour une grille 4×3) ; et « Lines: 0 » n'est pas une donnée manquante, c'est un
jeu **sans ligne de paiement** — toute la gamme Hold the Jackpot. Écrit
« No paylines ».

**`ecran-de-base.ts` ne fait plus travailler les lots pour rien.** Sur le lot
W4, 30 % des fiches tirées ne pouvaient rien produire : des vidéo pokers, des
bingos, un sic bo, et des fiches qui n'attendaient plus que des lignes désormais
moissonnées. `--manque grille` ne sert que ce qui manque, et un relevé peut
marquer une fiche **sans grille** (`"sansGrille": "raison"`) : elle sort du
bassin pour de bon. 11 fiches marquées, dont trois grilles « à trous » qu'aucune
notation ne décrit sans mentir — `magic-spins` est un anneau de 24 cases
jouables dans un cadre 7×7 dont les coins et le centre sont morts.

État : 6 070 fiches en ligne, **2 883 sans grille** (3 381 en début de nuit),
2 845 sans lignes. Wazdan n'a plus que 2 fiches en attente, toutes deux à
recapturer.

## 2026-09-20 — 1 495 démos retrouvées, la couverture passe de 67 % à 91 %

**Le vrai goulot n'était pas la capture, c'était la démo.** 2 017 fiches
publiées n'avaient aucune URL de démo : pas de démo, pas de capture ; pas de
capture, pas de jaquette ni de légende. Toute la chaîne bloquée à la source.

Une recherche studio par studio a retrouvé le lanceur officiel de **1 495**
d'entre elles. La méthode ne fabrique aucune URL : elle **lit** le bouton de
démo sur la fiche produit du studio — et la base portait déjà cette fiche dans
`rtp_source`, héritée de la campagne RTP de septembre. Aucun agrégateur : un
lien vers un concurrent est proscrit, et tous les hôtes retenus sont ceux des
studios ou de leurs plateformes (rgsmatrix pour Fantasma, the-rgs pour Caleta,
rubyplay pour Koala).

`scripts/adopter-demos-trouvees.ts` ne remplit que les fiches **sans** démo :
une démo qui marche n'est jamais remplacée, parce que le paramètre porteur du
jeu change d'un lanceur à l'autre.

**Ce qu'on sait des limites, et qu'il faut garder en tête :**
- **Endorphina (218 jeux) répond « 403 Forbidden For Your Region » depuis la
  France.** L'URL est bonne, la capture depuis ce poste ne l'est pas.
- Trois studios ne publient leur démo que sur un hôte de recette
  (`staging.the-rgs.com` chez Caleta, `stage.clutchgamingcdn.com` chez
  Backseat, `preprod.elaapi.com` chez Ela). C'est le lien que le studio
  lui-même affiche ; il peut disparaître sans préavis.
- Fugaso sert une coquille vide si deux pages sont demandées à moins de 3,5 s.
- **Un 200 ne prouve rien** chez Gaming Corps, Peter & Sons, NetEnt/Red Tiger,
  Stakelogic, Winspinity et 1spin4win : ils répondent 200 à l'octet près sur un
  identifiant inventé. Pour ceux-là, la seule preuve est la donnée lue sur la
  fiche produit, et c'est ce qui a été retenu.
- 522 fiches restent sans démo, dont **PG Soft (151)** : l'hôte du lanceur est
  connu, mais l'identifiant n'est publié que derrière une API que leur
  robots.txt interdit. Playson (24) est derrière Cloudflare.

**Le goulot se déplace vers les adaptateurs de capture.** Les 1 495 démos
neuves appartiennent à une vingtaine de studios dont `capturer-jeux.ts` ne sait
pas ouvrir le jeu. Sans adaptateur, la démo ne devient pas une capture.

Au passage : l'export vers BetsRank fait maintenant voyager la grille et les
lignes, mais **seulement quand une capture nommée les atteste** ; et un relevé
de structure peut désigner sa propre capture, puisque la grille se lit parfois
sur le schéma des lignes d'une page de règles plutôt que sur l'écran de jeu.

État des 6 069 fiches en ligne : démo 91 %, visuel 54 %, captures 42 %.

## 2026-09-19 (4) — la structure se lit sur une seule image

**1 391 fiches en ligne avaient leurs captures mais aucune grille**, 1 183
aucune ligne de paiement. Or les deux se lisent sur l'écran de base : un seul
PNG par jeu, contre dix pour une fiche de légendes. `scripts/ecran-de-base.ts`
ouvre ce chantier — il télécharge l'écran de base des fiches incomplètes, puis
écrit **uniquement les champs vides**, sauvegarde l'état d'avant et pose une
`Preuve` nommant la capture. Un champ déjà renseigné n'est jamais écrasé : un
écart avec l'écran se traite fiche par fiche, à l'image, jamais en lot.

111 fiches Spinomenal renseignées ce soir, chaque valeur inhabituelle
recontrôlée à l'image avant d'être gardée.

**Ce que les lots ont appris :**
- **Le titre ment.** « 81 Fruits Craze » est en 4×3 (3⁴ = 81), « 100 Juicy
  Fruits » n'a pas 100 lignes, et deux jeux nommés « aztec-spell » n'ont pas la
  même grille. On compte sur l'image, jamais sur le nom.
- **Tout badge chiffré n'est pas un compteur de lignes** : « JACKPOT 50 », les
  panneaux GRAND/MAJOR/MINOR/MINI, « WILD BET ». Le contrôle : PER LINE ×
  nombre = TOTAL BET affiché.
- **Une capture prise pendant l'écran d'intro** montre une illustration pleine
  hauteur par colonne : la grille ne se compte pas. Six fiches partent à la
  recapture. Parfois une page de règles sauve la mise — the-wild-300 est en 5×4,
  lu sur le schéma de ses 50 lignes.
- La série « 1 Reel » (45 jeux en 1×1) n'affiche aucun compteur de lignes : un
  jeu à un seul symbole n'en a pas. Le script ne la rappelle plus.

Au passage : `_tmp-demos-formats.ts` portait une requête morte qui cassait le
typecheck, et 33 fichiers de légendes traînaient à la racine du dépôt — rangés
hors du dépôt, avec les sauvegardes.

## 2026-09-19 (3) — 1 170 jaquettes posées, et l'état réel du catalogue

**1 170 fiches publiées n'avaient aucune jaquette** alors que leur jeu était
déjà photographié — Spinomenal, 1spin4win, Amusnet, Habanero, Stakelogic… Elles
affichaient le repli textuel. `adopter-capture-en-jaquette.ts` leur pose la
capture du jeu de base. Le script écrivait sa sauvegarde sous un nom figé
(`…-2026-09-13.json`) et a écrasé celle du 13/09 : il date désormais le fichier.
Rien d'essentiel perdu, une jaquette adoptée se reconnaît à son chemin
`/captures/`.

État mesuré sur les 5 994 fiches à RTP (hors tables live) : visuel 54 %, démo
66 %, captures 41 %, légendes 10 %. Les trous par cause :
- **démo présente, capture impossible depuis la France** : Red Tiger et NetEnt
  (`fansite.evo-games.com` limite dès la première requête, Cloudflare 1015),
  Push Gaming (CloudFront 403, géo-bloqué) ;
- **démo présente et accessible** : Evoplay, campagne lancée ;
- **aucune démo connue** : Endorphina, Fantasma, Caleta, Kingmidas, Gamingcorps,
  Popiplay, PG Soft — ni capture ni jaquette possible sans elle ;
- **Hacksaw** : les jeux restants pointent vers des pages produit retirées.

## 2026-09-19 (2) — Les clics « français » étaient un robot OVH

Des dizaines de clics FR par jour sur les fiches de jeux, et personne dans
Google Analytics. **202 des 207 clics de la semaine venaient d'un robot** :
des serveurs OVH (141.94.x, 51.75.x, 149.202.x, 57.129.x…) qui aspirent les
fiches, suivent les liens `/go/<casino>?slot=<jeu>` — que `robots.txt` interdit
déjà — et repartent. Deux user-agents en tout (« Chrome 148 Windows »,
« iPhone iOS 13.2.3 »), aucun referer, 95 jeux parcourus dans l'ordre, deux
casinos à une seconde d'écart depuis deux IP. Un robot n'exécute pas le script
de mesure : d'où le silence d'Analytics. Les 5 vrais clics, eux, portaient un
referer where2spin.

L'écran de sortie enregistre le clic côté serveur, exprès (un bloqueur de
scripts ne doit pas effacer un lead) : chaque passage du robot devenait donc un
clic dans la clé partagée avec BetsRank, et une notification Discord. Et son
`<meta refresh>` de repli l'envoyait jusqu'au réseau affilié avec un de nos
clickIds — du faux trafic chez un partenaire, qui peut sanctionner.

`estUnPassageSansParcours` : nos liens de sortie ne vivent que sur nos pages et
dans Discord, donc un vrai clic porte un referer where2spin ou vient de Discord.
Un appel direct est consigné à part (`w2p:clics-suspects:<jour>`, 30 jours,
retrouvable par clickId), ne notifie personne, et perd le `<meta refresh>`. On
ne bloque personne : la redirection JavaScript et le bouton restent, un humain
passe toujours. Les 202 passages déjà inscrits dans `bce:clicks` sont laissés
tels quels — les retirer imposerait de réécrire une clé partagée, pour une
statistique passée.

## 2026-09-19 — Les relevés d'écran de BetsRank, et 384 preuves sans fondement

**513 jeux Pragmatic relus à l'écran.** BetsRank a relu, capture par capture,
ses fiches Pragmatic — ce sont les mêmes captures que les nôtres, dans le même
bucket. Reportés ici par `scripts/appliquer-releves-ecran.ts` : **152 grilles,
243 lignes, 80 plafonds et 5 RTP** que l'écran contredisait. Chaque correction
laisse une ligne `Preuve` qui nomme la capture et la page, avec l'ancienne
valeur en note : le panneau fait autorité, mais rien n'est écrasé en silence.
Les valeurs spectaculaires ont été revérifiées à l'image avant d'écrire
(Mahjong Wins Super Scatter plafonne à 100 000x, Monster Superlanche à 5 000x,
Chicken Chase à 210x). Le RTP n'a été touché que hors confiance STUDIO, et avec
ses métadonnées : source du panneau, date, confiance. Les 20 grilles que le
relevé libelle en français (« extensible », « rangée ») ne sont pas reportées,
`grille` s'affichant telle quelle dans les trois langues.

**Le piège : une preuve qui affirme avoir lu ce que sa capture ne montre pas.**
`adopter-preuves.ts` attachait la volatilité et le plafond en base à la capture
qui porte le RTP, en supposant qu'elle les montrait. Or 588 légendes
automatiques n'énoncent **que** le RTP. Monster Superlanche portait une preuve
de 20 000x adossée à une page où aucun 20 000 n'apparaît ; l'écran dit 5 000x.
Bilan sur 1 256 preuves automatiques de volatilité et de plafond :
- 67 plafonds contredits par l'écran : annotés, valeur corrigée ;
- **384 sans fondement** (111 + 19 + 25 plafonds, 153 + 19 + 57 volatilités sur
  Pragmatic, Hacksaw, BGaming) : la légende automatique d'origine de leur capture
  n'énonce pas la valeur. Annotées, pas supprimées — la table garde l'historique.
- Une légende **réécrite à la main** ne témoigne plus de ce que la chaîne de
  capture a lu : son silence ne prouve rien, ces preuves-là ne sont pas jugées.

`adopter-preuves.ts` n'adopte désormais une volatilité ou un plafond que si la
légende de la capture l'énonce (`scripts/adopter-preuves-legende.ts`).

Ces preuves ne s'affichent pas sur le site ; les **valeurs** si, et ce sont
elles qui sont corrigées. Sauvegardes : `w2p-releves-ecran-avant-2026-09-19.json`
et `w2p-preuves-auto-avant-2026-09-19.json` dans `sauvegardes-betsrank/`.

## 2026-09-17 (2) — Pandibet remplace Vave

Vave passe `actif: false`, Pandibet entre au catalogue sous l'**id 151**, le
même qu'à BetsRank : les ids restent alignés entre les deux sites pour qu'un
clic se recoupe sans table de correspondance.

**Les studios ne sont pas devinés.** La page « Fournisseurs » du casino
(`pandibet.com/fr/game-providers`) affiche 106 studios, chacun avec son nom :
45 ont une clé chez nous, et ce sont les seules écrites. **Ni Pragmatic Play ni
Hacksaw n'y figurent** — les deux plus gros pourvoyeurs de nos fiches. Les
ajouter par habitude aurait affiché Pandibet sur des milliers de jeux qu'il ne
propose pas, ce qui envoie le joueur dans le vide.

Bonus relevé sur le site le même jour : 125 %, puis 75 %, puis 100 %, chacun
plafonné à 500 €. Le détail des conditions est dans BetsRank,
`docs/sources/pandibet-2026-09-17.md`.

Vave garde sa ligne et ses 25 studios : un deal qui reprend n'aurait qu'un
drapeau à rebasculer.

## 2026-09-17 — Un contrôle appris ailleurs peut mentir

Lot 1spin4win, famille Cash'n Fruits : **10 fiches, 71 captures**.
**562 fiches légendées, 4 391 captures sur 20 291 (22 %).**

### Le contrôle Hacksaw ne se transporte pas

Le contrôle appris chez Hacksaw — *le studio dessine le symbole autant de fois
qu'il en faut pour déclencher* — **ne marche pas chez 1spin4win**.
`cashn-fruits-256-regles-2` dessine **une seule pièce** sous un texte qui dit
« If 3 or more coins appear » : là-bas, l'illustration est parfois un portrait
de symbole et non un décompte.

C'est la leçon la plus utile du lot, et elle est maintenant dans la consigne :
**avant d'appliquer un contrôle appris ailleurs, vérifier qu'il tombe juste sur
deux ou trois cas de CE studio.** Un contrôle qui se trompe est pire que pas de
contrôle — il donne l'assurance sans la preuve.

### Une quatrième vérification gratuite, celle-là valable

Chez 1spin4win, **les pièces du Megapot sont exactement la grille** : 9 en 3×3,
15 en 5×3, 16 en 4×4, 20 en 5×4, et le texte le confirme (« Hold all 20 coins »).
Cinq fois sur cinq. Un contrôle de grille de plus, indépendant de la page
« ways ».

### Deux façons dont l'analogie de grille ment

`cashn-fruits-fortune` a la **même grille 3×3** que `cashn-fruits-27` et ne paie
que sur **5 lignes** — dessinées une par une, numérotées 1 à 5, page 5/5. Écrire
« 27 façons » par ressemblance aurait été faux.

Et le nombre du titre n'est pas toujours des façons : `27`, `243` et `256`
annoncent bien 3³, 3⁵ et 4⁴, chacun confirmé par sa page « ways » — mais `100`
annonce des **lignes**. Sa grille 5×4 donnerait 1 024 façons, et le panneau
dessine cent tracés numérotés jusqu'à 100. **Quand le produit des hauteurs ne
tombe pas sur le nombre du titre, ce n'est pas une erreur, c'est un autre
système de gains.**

### Le bilan honnête du contrôle

**8 accords, 0 écart** sur les façons de gagner : les sept fiches qui portaient
« N ways » en base le portent exactement là où le panneau l'annonce.

Mais sur le RTP : **4 accords, 0 écart, 6 muets.** Six de ces dix panneaux
n'impriment aucun RTP — leurs valeurs en base ne sont ni confirmées ni
contredites. Le « 0 écart » de ce lot est à moitié un silence, et l'agent a eu
raison de le dire.

Dix grilles écrites, trois nombres de lignes. **Aucun `gainMaxMultiple` :** les
71 pages ne portent aucun titre de plafond. Les seuls grands nombres titrés sont
des jackpots que les compteurs confirment — et un jackpot n'est pas un plafond,
le jeu de base paie en plus.

### Une phrase à ne jamais recopier

La barre défilante de `cashn-fruits-243-x` annonce « 3 Jackpot symbols win Lucky
Jackpot » — dans un jeu qui **n'a aucun compteur de jackpot** et dont le panneau
de trois pages n'en décrit aucun. C'est un message rotatif du châssis, partagé
entre plusieurs jeux du studio. Signalé, jamais utilisé.

## 2026-09-16 (nuit, 6) — Un plafond arithmétiquement solide qu'on n'écrit pas

Troisième lot Wazdan : **10 fiches, 116 captures**. **552 fiches légendées,
4 320 captures sur 20 291 (21 %).**

### Le lot le plus propre du chantier

Aucun écart. Les dix RTP concordent au centième, et **tous les comptages
dessinés tombent sur le nombre annoncé** : 20 tracés pour les quatre jeux à
20 lignes, 10 pour `book-of-faith`, 16 cases pour « played on 16 reels »,
12 pour « played on 12 reels », 9 pour la grille 3×3 de `burning-stars-3`.

Et un accord vaut d'être noté autant qu'un écart :
`black-horse-cash-out-edition` portait déjà 2 500× en base. Le compteur GRAND
le confirme tout seul — 150 000,00 pour une mise de 60,00. Le contrôle n'est
pas muet : quand la fiche est juste, il le dit.

### Le plafond refusé

Le compteur GRAND de `burning-stars-3` donne **2 187×** à deux mises
différentes — 131 220 / 60 et 4 374 / 2 — et 2 187 = **3⁷**, l'échelle des
jackpots triplant à chaque cran. C'est arithmétiquement imparable.

Et ça ne suffit pas. Cette aide **n'a pas de page Disclaimer**, et aucune
phrase n'y écrit que le GRAND est le gain maximum du jeu — alors que
`burning-sun` et `bumba-meu-boi-coin`, eux, l'écrivent. Le champ reste vide.

La règle se précise, et c'est la formulation à retenir : **le compteur GRAND
confirme un plafond publié, il n'en crée pas.**

### Trois jeux, pas trois habillages

`black-horse` → Cash Out Edition → Deluxe : 3×3 à 5 lignes, puis **5×3 à 20
lignes**, puis **6×3 à 20 lignes**. Trois grilles différentes sous un même nom.
Le piège de `black-hawk-deluxe` — texte à 54 lignes, bannière à 27 — ne se
reproduit pas : le Deluxe se confirme trois fois, dont « The game has 6 reels,
3 rows and 20 paylines ».

`burning-stars` et `burning-stars-3` n'ont **aucun rapport** : un 5×3 à
20 lignes sans le moindre tour gratuit, et un 3×3 à neuf rouleaux indépendants
qui paie « at least 4 symbols of a kind anywhere ». Seul le nom les relie.

`burning-sun-extremely-light` confirme ce qu'on avait vu sur 9 Coins :
**« Extremely Light » est un rendu, pas une variante.** Les 14 captures
comparées une à une donnent la même grille, la même table ligne pour ligne, les
mêmes jackpots, le même RTP et le même Disclaimer. Seuls changent le dessin et
deux valeurs d'illustration.

### Un avertissement de lecture

Trois jeux anciens — `burning-reels`, `burning-stars`, `captain-shark` —
affichent **deux tables de gains à des barèmes différents sans le dire** : celle
du panneau est 150 fois plus petite que celle de l'écran, et aucun « Paytable
shows the win for minimal bet » n'apparaît nulle part. Les légendes le disent
explicitement pour que personne ne convertisse de travers.

## 2026-09-16 (nuit, 5) — Deux RTP « faux » qui ne l'étaient pas

Second lot Wazdan écrit (10 fiches, 82 captures). **542 fiches légendées,
4 204 captures sur 20 291 (21 %).**

### La provenance change le verdict

Un rapport signalait deux RTP faux : `bells-of-fortune` 96,10 en base contre
96,13 au panneau, `beach-party` 96,37 contre 96,48. Les deux phrases sont bien
à l'écran, relues à l'image.

Mais la question n'était pas « que dit le panneau », c'était **d'où vient la
valeur en base**. Les deux viennent de `wazdan.com/games/<slug>`, la page produit
du studio. Le panneau du jeu est donc une **autre source du même studio** — et
Wazdan livre ses jeux en plusieurs configurations de RTP selon l'opérateur.

Deux sources valables, et le panneau est chaque fois **le plus généreux**.
Arbitrer vers lui reviendrait à remplacer un chiffre publié par un chiffre plus
flatteur sans savoir lequel le joueur rencontrera. La valeur est conservée, la
divergence est écrite dans `rtpSource` pour qu'aucune passe suivante ne la
« corrige » en silence. Même décision que sur Starburst XXXtreme.

À retenir : **un écart n'est une erreur que si l'une des deux sources n'en est
pas une.** Avant de corriger, lire `rtpSource`.

### Ce qui a été écrit

`bells-of-fortune` — plafond **1 000×**, et c'est le contre-exemple de la règle
posée deux heures plus tôt : ici le nombre est sous un titre qui EST un plafond,
la page **DISCLAIMER**, « The maximum win amount is 1000x bet. » Le compteur
GRAND le confirme seul : 60 000,00 pour une mise de 60,00. Grille **4×4** —
seize cases comptées, et le panneau parle de « all **16** Bonus symbols ».

`beach-party` — grille **5×3**, **20 lignes** : les schémas sont numérotés
jusqu'à 20 sans 21, et dessinés sur une matrice de cinq colonnes de trois.

Aucun plafond écrit pour les huit autres : aucune ne publie de MAX WIN ni de
Disclaimer, et leur Gamble double sept fois — leurs grosses lignes de table de
gains ne sont pas des plafonds.

### Une contradiction interne à signaler

`black-hawk-deluxe` se contredit lui-même : son panneau dit « **54 win lines**
are located on the three reels from the left side and on the three reels from
the right side » et numérote ses schémas jusqu'à 54, alors que la bannière du
jeu affiche « **27 WIN LINES** ». Le texte et les schémas du Deluxe semblent
recopiés de Black Hawk, dont la bannière annonce bien 54. Rien n'est écrit en
base : le champ reste vide tant que le jeu ne s'accorde pas avec lui-même.

## 2026-09-16 (nuit, 4) — L'apostrophe manque à des studios entiers

Second lot Spinomenal écrit (10 fiches, 41 captures). **532 fiches légendées,
4 122 captures sur 20 291 (20 %).**

### Un nom faux, et une classe de noms à surveiller

La fiche `1-reel-gladiators-rising` s'appelait « 1 Reel Gladiators Rising ».
Deux sources à l'écran disent autre chose, et elles sont d'accord :

- le logo du jeu, sur la capture de base : « 1 REEL **GLADIATOR'S** RISING » ;
- l'en-tête des trois pages de règles : « 1 Reel - **Gladiator's** Rising ».

Un pluriel là où le studio écrit un possessif. Corrigé — le slug ne bouge pas,
il est en ligne et le renommer casserait l'URL pour rien.

**Et le comptage qui suit est plus intéressant que la correction.** Sur les
11 658 fiches du catalogue, 140 portent une apostrophe dans leur nom (1 %), mais
elles sont **concentrées sur quelques studios** — Pragmatic 36, Play'n GO 38,
PG Soft 13, Hacksaw 11, BGaming 10. Des studios entiers sont à **zéro** :
Spinomenal 0/648, Yggdrasil 0/574, Amusnet 0/280, Evoplay 0/269, Wazdan 0/262,
Microgaming 0/214, Stakelogic 0/206.

Zéro sur 648 n'est pas crédible pour un catalogue de cette taille, et on vient
d'en vérifier un à l'image. C'est donc un **défaut de la voie d'import**, pas un
hasard : les noms de ces studios sont arrivés sans leurs apostrophes.

On ne corrige rien en masse — deviner où une apostrophe manque, c'est inventer.
Mais la piste est réparable sans deviner : **le logo du jeu est dans la capture
de base de chaque fiche**, et il porte le titre exact. Une passe d'OCR sur cette
seule zone rendrait les vrais noms, fiche par fiche, sans supposition.

### Le contrôle était muet, et l'agent l'a dit

Les dix fiches du lot n'ont que le RTP et ses paliers ; grille, mécaniques,
plafond, volatilité, achat de bonus sont vides, et le panneau de ces jeux n'en
publie aucun. Il n'y avait donc rien à confronter : « 0 écart » ne vaut rien ici.

La règle du 16/09 a par ailleurs tenu sa première épreuve toute seule : le lot a
**refusé** d'écrire un plafond à partir du compteur `JACKPOT 50` affiché pour une
mise de 0,10, soit 500× — parce que le panneau dit que le jackpot **s'ajoute** à
la banque et aux gains directs, et qu'aucune page ne publie de plafond sous un
titre qui en est un.

`1-reel-golden-piggy` n'a aucun RTP en base, et son panneau n'en publie pas :
c'est un trou, pas un écart, et il reste ouvert.

## 2026-09-16 (nuit, 3) — Trois plafonds refusés, sept confirmés par une division

Lots Spinomenal (10 fiches, 40 captures) et Wazdan (10 fiches, 123 captures)
écrits. **523 fiches légendées, 4 086 captures sur 20 291 (20 %).**

### Trois plafonds qu'on n'écrit pas

Un rapport signalait trois `gainMaxMultiple` vides « que le panneau remplit » :
`9-tigers` 1 000×, `american-gold-poker` 1 000×, `american-poker-v` 800×.
Vérification faite à l'image, les trois sont des **lignes hautes de table de
gains**, pas des plafonds :

- `9-tigers` — « 9X 60,000.00 FUN » est le haut de la colonne du Tigers Bonus.
  La page GAME RULES ne publie que « Game average return to player: 96.15% » et
  la clause de malfonction : **aucun MAX WIN**. Le jeu principal paie en plus.
- `american-gold-poker` — la page GAMBLE FEATURE dit « **The gamble feature has
  seven rounds** », et chaque manche double. La table ne peut pas être le
  plafond.
- `american-poker-v` — même structure, même raison.

C'est « Multipliers x500 » d'un cran au-dessus : **le plus gros nombre d'une
page n'est pas le plafond du jeu.** Règle écrite dans la consigne — on n'écrit
un plafond que sous un titre qui en est un (MAX WIN, Simulated maximum payout,
Win CAP, Disclaimer). Trois promesses inventées évitées.

### Et sept plafonds confirmés sans ouvrir une page de règles

Chez Wazdan, le compteur **GRAND** affiché à l'écran divisé par la mise totale
donne le plafond de la fiche. À 60,00 de mise : 30 000 → 500×, 60 000 → 1 000×,
90 000 → 1 500×, 150 000 → 2 500×, 300 000 → 5 000×, 45 000 → 750×. Les sept
`gainMaxMultiple` déjà en base tombent juste tous les sept. Troisième
vérification gratuite du chantier, après le produit des hauteurs Megaways et le
comptage des scatters Hacksaw.

Sept grilles comblées au passage, comptées une par une : les cinq éditions de
9 Coins, 9 Lions et 9 Tigers sont toutes en **3×3**.

### Un lot bloqué, non publié

L'agent du lot Pragmatic (10 fiches) s'est vu refuser l'écriture par le contrôle
de permissions. Ses lots sont intacts dans le scratchpad de session ; ils ne
sont **pas** passés en base, et ils n'y passeront pas sur la seule demande de
l'agent. Décision à prendre par BetsRank.

## 2026-09-16 (nuit, 2) — Une phrase fausse publiée sur 134 pages, et la moitié d'une règle qui disait l'inverse

### Le défaut

L'outil publiait « **La fonction ne peut pas être relancée une fois commencée** »
sur 134 captures sans légende à la main, dans les trois langues. La règle qui la
déclenche est `/feature cannot be retriggered/`. Or chez Pragmatic, cette phrase
est la **fin** d'une règle qui accorde la relance. Vérifié à l'image sur
`big-bass-raceday-repeat`, page 3/8 :

> « Every 4th MAN WILD symbol collected **retriggers the feature**, awards 10
> more free spins and the multiplier for MONEY symbol collection increases to 2x
> for the second level, 3x for the third level and 10x for the fourth level.
> **After the fourth level, the feature cannot be retriggered anymore.** »

La fonction se relance donc trois fois. Le site disait qu'elle ne se relance
jamais.

C'est la **même classe d'erreur** que « Lines are fixed at 1 - 3 » lu comme
« 1 ligne » : un motif lit une phrase, il ne lit pas celle d'avant. La leçon
apprise sur une formule ne s'était pas propagée aux autres — faute d'endroit où
l'écrire.

### La réparation

Le type `Enonce` gagne un champ **`interdits`** : ce qui doit être absent de la
page pour que l'énoncé tienne. Sur `sans-relance`, deux interdits — un panneau
qui contient « retriggers the feature » ou « can be retriggered » n'est plus lu
comme une négation. Les lectures à venir sont justes.

Les 134 déjà en base, en revanche, **ne gardent que le code de l'énoncé, pas le
texte OCR qui l'a produit** : impossible de distinguer après coup le panneau qui
nie vraiment de celui qui limite. La seule réparation qui les couvre toutes est
de retirer le `dit` de l'énoncé — il situe encore la page, il n'affirme plus
rien. Une affirmation négative invérifiable est exactement celle qu'on ne publie
pas. La phrase reviendra quand les captures garderont leur texte.

Deux tests verrouillent les deux moitiés : la lecture ne retient plus
« sans-relance » sur un panneau qui accorde une relance, et aucune des trois
langues ne parle de relance même sur un panneau qui la nie vraiment.

### Aussi, relu à l'image

`big-bass-raceday-repeat` vend **trois** achats (100×, 160× et 1 250× la mise
totale) ; la fiche n'en portait qu'un. Les deux autres sont écrits. Un joueur
qui compare les Big Bass lisait un prix d'entrée sans savoir que le jeu en
propose un à 1 250×.

## 2026-09-16 (nuit) — Trente fiches de plus, et le piège inverse du contrôle par le produit

Trois lots rendus : la suite des Big Bass (10 fiches, 80 captures), Nolimit City
(10 / 41) et Stakelogic (10 / 85). **503 fiches légendées, 3 923 captures sur
20 291 (19 %).**

### La même erreur, deux fois, dans les deux sens

`big-bass-halloween-3` annonçait « achat de bonus : non » alors que son panneau
en vend deux — « Pay 100x total bet to trigger the FREE SPINS feature… Pay 300x
total bet to trigger the SUPER FREE SPINS feature » — et que son propre champ
`mecaniques` portait déjà « Bonus buy 100x ». Exactement le défaut trouvé hier
sur `big-bass-christmas-frozen-lake` : **une fiche qui se contredit elle-même**.
Ce n'est pas un hasard de saisie, c'est un motif ; le champ booléen et le champ
texte ont été remplis par deux passes qui ne se parlaient pas.

### Un palier de valeur pris pour un multiplicateur

La même fiche portait « Multipliers x500 ». Le 500x est bien à l'écran, mais
dans la liste des valeurs du symbole MONEY : « 2x, 5x, 10x, 15x, 20x, 25x, 50x,
100x, 200x, 500x or 5000x total bet ». Le multiplicateur, lui, est plafonné
trois lignes plus bas : « 2x for the second level, 3x for the third level and
10x for the fourth level ». **Un nombre n'est un multiplicateur que si la phrase
qui le porte le dit.**

### Le piège inverse : la capture n'est pas toujours l'état de base

Le contrôle « le nombre affiché = le produit des hauteurs » a tourné six fois et
n'est tombé juste que cinq. La sixième est instructive. Sur
`stockholm-syndrome`, la grille dessinée donne 3-4-4-4-3 (576 façons) là où le
panneau dit 3-4-3-4-3 et 432. Deux chiffres du panneau se confirment l'un
l'autre ; le comptage n'en confirme aucun. **La capture avait été prise avec le
rouleau central déjà étendu.** Même chose sur `supersized`, photographié à dix
colonnes en cinq paires CLONE / CLONED, et sur `joker-drop-popwins`, dont la
plaque annonce 2 048 façons quand la grille ouverte en donne 1 024.

D'où la règle ajoutée à la consigne : **si le panneau se confirme lui-même et
que le comptage est seul de son côté, c'est l'image qui montre un état
transitoire.** On le signale, on n'écrit rien.

### Dix fiches Stakelogic sortent du vide

Les dix étaient à `null` sur grille, lignes, achat de bonus, plafond et
volatilité. Huit grilles et cinq nombres de lignes sont désormais écrits, tous
lus à l'image : la page GAME RULES du studio ouvre par une phrase invariante
(« a highly animated ten (10) win line, five (5) reel, three (3) row video slot
game ») qui donne les trois en une fois. Trois achats de bonus sont écrits parce
que leur écran d'achat est au dossier — hot-chilli-fest à 200,00 pour 2,00,
joker-drop-popwins à 80,00 pour 1,00, jaws-of-fortune dont le bouton BUY BONUS
est visible sur l'écran de jeu.

`hold4timer` et `joker-drop-popwins` gardent leur grille vide **exprès** : l'une
va de trois à six rouleaux selon le nombre de GAMES activés, l'autre monte à
sept rangées. Y figer un « 5×4 » serait faux la plupart du temps. L'achat de
bonus reste `null` partout où aucun écran ne le prouve : l'absence de bouton sur
une capture n'est pas une preuve d'absence.

### Aussi

`space-donkey` : le panneau liste cinq fonctions, la fiche en portait quatre.
« Safe Word » ajouté.

## 2026-09-16 (soir) — Neuf corrections, et deux façons de compter qui ne mentent pas

Les lots écrits sous la règle du « au moins un élément visuel » rapportent
davantage que les précédents, et pour une raison mécanique : **on ne trouve que
ce qu'on regarde**.

### Big Bass — une valeur recopiée d'un jeu voisin, trois fois sur le même

`big-bass-bonanza-megaways` était faux sur trois champs à la fois :

| champ | fiche | panneau |
|---|---|---|
| façons de gagner | 117 649 (= 7⁶) | **46 656** (= 6⁶) |
| relances | illimitées | **trois maximum** |
| achat de bonus | oui | **aucun bloc d'achat, un seul RTP** |

Et `big-bass-christmas-frozen-lake` disait l'inverse — achat à « non » quand son
panneau en publie **deux**, à 100× et 270×, et que son propre champ
`mecaniques` portait déjà « Bonus buy 100x ». La fiche se contredisait
elle-même.

### Hacksaw — un gain maximum annoncé au double

`ronin-stackways` promettait **10 000×**. Son panneau dit « The max win in this
game is **5,000** times your bet! », et le répète en section MAX WIN. C'est le
pire sens d'erreur : on promet deux fois ce que le jeu rend.

Deux grilles fausses aussi — `reign-of-rome` (5x4 pour un « 5-reel, 5-row game »)
et `shaolin-master` (5x5 pour un « 5-reel, 6-row game ») — et deux noms de bonus
inexacts sur `pray-for-three` et `rad-maxx`.

### Les deux contrôles, versés à la consigne

**Le compteur d'un Megaways est le produit des hauteurs.** 2 400 affiché =
2 × 4 × 4 × 5 × 5 × 3 compté. Si le produit ne tombe pas juste, c'est le
comptage qui est faux — un agent s'est rattrapé ainsi avant d'écrire.

**Hacksaw dessine le scatter autant de fois qu'il en faut** pour déclencher un
bonus. Trois exemplaires empilés = trois scatters. C'est ce qui a montré que
`pray-for-three` annonçait à « 5+ » un bonus qui s'obtient à trois.

La règle générale : quand un jeu **affiche** un nombre et le **dessine** aussi,
les deux doivent concorder. Le désaccord est toujours une information.

## 2026-09-16 — « C'est pas toujours ouf » : ce que 47 % des légendes ne faisaient pas

BetsRank a relu quelques légendes et les a trouvées tièdes. Mesure sur les
3 346 déjà écrites : la recopie du panneau est rare (**1 %**), mais **47 % ne
contiennent aucun élément visuel** — ni position, ni valeur affichée, ni
couleur. Elles sont vraies, et quelqu'un qui n'a jamais ouvert la capture aurait
pu les écrire.

L'écart se voit sur deux légendes du chantier, même studio, même type de page.
Au niveau, Christmas Gift Rush :

> « Trois rouleaux sur trois rangées, mais **une seule ligne active au départ —
> la guirlande lumineuse encadre la rangée centrale, seule allumée**. En haut à
> gauche, le bouton Buy Feature est affiché à ‡30,00 pour la mise de ‡1,00. »

En dessous, 20 Super Hot :

> « L'introduction du panneau : « 20 Super Hot video slot is a 5-reel, 20-line
> fixed game. » »

La seconde recopie un texte que le lecteur a déjà sous les yeux.

**La consigne porte désormais une règle dure** : toute légende contient au moins
une chose qu'on ne peut savoir qu'en regardant. Avec l'étalon et ces deux
exemples en regard — une règle abstraite ne se transmet pas.

Premier lot écrit sous la nouvelle règle : Pragmatic passe de 49 % à 57 % de
légendes visuelles, ce qui place **les 81 nouvelles autour de 90 %**.

### La vérification gratuite des Megaways

Trouvée par un agent en comptant les grilles : le compteur affiché à l'écran
**est** le produit des hauteurs. 45 360 sur Bandit Megaways = 6·7·6·6·6·5.
S'il ne tombe pas juste, c'est qu'on a mal compté — et c'est arrivé, le
comptage à l'œil nu donnait faux avant recadrage.

### Deux corrections

`beware-the-deep-megaways` annonçait « Multipliers x500 » ; son panneau borne à
×25 en jeu de base et ×100 en tours gratuits. Le ×500 appartient à
`bandit-megaways`, du même lot — deux jeux voisins confondus.

`anaconda-gold` : le panneau publie 96,54 % et **96,47 % à l'achat**, le second
manquait en base.

Une alerte s'est dégonflée à la mesure : un agent soupçonnait le générateur
automatique de poser « RTP distinct pour la partie achetée » à tort sur beaucoup
de fiches. Il ne la porte que sur **une**, et elle y est vraie. Compter avant
d'ouvrir un chantier.

## 2026-09-15 (fin de journée) — Pragmatic décrit d'autres jeux que les siens

**Neuf fiches Pragmatic sur dix contredisent leur propre panneau**, et pas sur
des détails. Deux vérifiées à la main, mot pour mot :

- **Aztec Smash** — base : grille `5×3`, `20` lignes. Panneau : « The game is
  **played on a 7x7 grid** of symbols » et « All symbols pay in **blocks** of
  minimum 5 symbols connected horizontally or vertically ».
- **Argonauts** — base : `6x5`, `Pay Anywhere`, achat de bonus `non`. Panneau :
  « **1024 ways to win** », gains de gauche à droite, et « can be instantly
  triggered from the base game by **buying it for 60x** ».

Le lot entier a aussi donné des nombres de tours gratuits faux (8 au lieu de 5
sur Asgard), des cascades annoncées sur des jeux qui n'en ont pas, et des
achats déclarés absents alors qu'ils existent.

**584 fiches Pragmatic affirment une description de jeu — 95 % du studio,
presque un quart du catalogue publié.**

Ce qui désigne l'origine : les studios à 100 % qui tiennent la route — BGaming,
Play'n GO, Hacksaw, Nolimit City — ont été remplis **par nos propres campagnes
de capture**, qui lisent le panneau. Pragmatic vient du même import que les 27
noms cassés en « Apos » et que « Pirates Riches Slot 23 May 2019 ».

Le lecteur apprend au passage la formulation de grille de ce studio (« played
on a 7x7 grid »). Sans elle la confrontation n'avait **rien à comparer** sur
Aztec Smash, et la fiche passait pour concordante : un outil de contrôle qui
ignore la langue du panneau ne trouve aucune erreur, et ce silence ressemble à
un bon résultat. Même piège que les 45 panneaux Nolimit comptés « muets ».

**Décision en attente** : la confrontation des 584 n'a pas encore tourné.
Trois voies — vider ces champs sur les fiches non vérifiées, les garder le temps
de reprendre le studio, ou lancer une campagne de vérification dédiée.

## 2026-09-15 (suite) — Des noms de jeux cassés à l'import, et deux chiffres faux

### 27 noms portaient une entité HTML à moitié décodée

Un agent a remarqué que `Buffalos Wealth` s'appelle **Buffalo's Wealth** sur son
enseigne. Vérifié à l'image, puis creusé : le catalogue portait **27 noms où
`&apos;` avait fondu en « Apos »** — « That Apos s Rich » pour *That's Rich*,
« Free Reelin Apos Joker » pour *Free Reelin' Joker*, « Pandora Apos s Box of
Evil ».

**Aucun n'est publié**, donc rien n'est indexé de travers — mais la prochaine
campagne les aurait mis en ligne tels quels. Tous réparés, plus sept noms
vérifiés un par un dont **`Azlands Gold`, qui s'appelle `Aztlan's Gold`** : deux
lettres et une apostrophe d'écart sur un titre servi en h1. Le slug n'a pas
bougé, donc aucune URL ne change.

Détail de méthode : la réparation automatique produisait « Casino Hold' em ».
« Hold'em » se soude, « Reelin' Joker » garde son espace. Corrigé avant
écriture — une faute d'orthographe publiée vaut mieux évitée que corrigée.

### Fire in the Hole 2 décrivait le premier épisode

La fiche annonçait **486 façons** et une grille démarrant en **6×3**. Son
panneau dit « From **64** ways up to 46656 win ways » et « a 6-reel, **up to
6-row** ». L'arithmétique tranche : 64 = 2⁶, le jeu démarre à deux rangées ; une
grille 6×3 donnerait 729 façons. C'étaient les valeurs de *Fire in the Hole*,
recopiées sur sa suite.

### Le lecteur avait tort, pas la fiche

Sur `das-xboot`, l'outil signalait 576 ways contre 75 712. Le panneau dit « From
576 ways **up to** 75712 win ways » : la grille se transforme, et la fiche avait
raison. Seule la règle **« on n'écrit que dans un champ vide »** a empêché
d'écraser du juste par du faux. Le lecteur sait désormais lire une plage, et
deux formulations de plus : `Ways are fixed at 178` (Habanero, où la mise suit
dans la même phrase et ne doit pas être ramassée) et les grilles qui se
transforment.

### Où en est le remplissage

Le nombre de lignes manquait sur 1 415 fiches publiées ; il en reste **1 269**
(57 % → 51 %). Habanero, 1spin4win, Spinomenal et Amusnet sont passés.

La **grille**, elle, reste à 57 % : les panneaux d'Amusnet et d'Habanero donnent
les rouleaux mais **jamais les rangées** — il faut les compter à l'image. C'est
la limite de l'OCR sur ce chantier, et ça restera du travail d'agent.

## 2026-09-15 (suite) — Les panneaux publiaient déjà ce qui manquait aux fiches

**Les légendes écrites à la main passent de 189 à 326 fiches** (13 % du
catalogue, ~2 470 captures en trois langues). Quatre studios sont amorcés qui
ne l'étaient pas : Spinomenal, Amusnet, 1spin4win, Habanero.

### Le second chantier rapporte plus que la chasse aux erreurs

57 % des fiches publiées n'ont ni grille ni nombre de lignes. Or leur panneau
le publie, et on l'a déjà photographié. `remplir-champs-vides.ts` relit les
captures en base et n'écrit que dans un champ **vide** ; sur une fiche déjà
renseignée il compare, ce qui valide la formule à l'échelle plutôt que par
raisonnement. Habanero : 28 fiches. 1spin4win : 43.

### Quatre formulations apprises, une erreur arrêtée à temps

Une seule valeur fausse est passée, et c'est la validation croisée qui l'a
trouvée : `christmas-gift-rush` a reçu « 1 fixed lines » alors que son panneau
dit « Lines are fixed at **1 - 3** » — une fourchette dont la formule ne gardait
que le premier nombre. Corrigée. Le lecteur sait désormais lire :

| formulation | studio | ce qu'elle donne |
|---|---|---|
| `Lines are fixed at 1 - 3` | Habanero | une fourchette, pas son premier terme |
| `1024 win ways by default` | Nolimit City | l'adjectif est devant le nom |
| `A 5-reel, up to 6-row video slot` | Nolimit City | une hauteur qui varie |
| `A 5-reel, 3-3-3-3-1 row setup` | Nolimit City | une grille en dents de scie |
| `The amount of lines ranges between 10-100` | Spinomenal | des lignes **choisies**, pas fixes |

Cette dernière est le piège le plus cher : Spinomenal « 100 Juicy Fruits » et
1spin4win « Booming Fruits 100 » portent 100 dans leur nom, ouvrent leur démo à
10 et 20 lignes, et un sélecteur laisse le joueur choisir. Deux agents l'ont
relevé le même jour sur deux studios différents.

Les formules Nolimit City ont aussi débloqué la confrontation sur ce studio :
45 panneaux comptés « muets » publiaient en réalité tous leur grille. Résultat,
**23 accords et 5 écarts** — dont `das-xboot`, 576 ways en base contre 75 712 au
panneau.

### Trois défauts d'outil, tous signalés par les agents

- **Un `lot.json` partagé** : un agent a vu le lot d'un autre studio apparaître
  au milieu du sien, entre son écriture et sa relecture. La consigne impose
  maintenant un nom par studio.
- **Une sauvegarde qui s'écrasait** : repasser sur une fiche le même jour
  remplaçait la sauvegarde de son état d'origine par celle du premier jet — on
  perdait exactement ce à quoi on voulait pouvoir revenir. Une seconde écriture
  va désormais dans un fichier numéroté.
- Le mode vérification n'examinait que les fiches dont les **deux** champs
  étaient remplis : il écartait donc précisément celles qu'on venait d'écrire.

## 2026-09-15 — Deux marques de plus, et leurs studios établis sans les supposer

Spin Million et Slotaza rejoignent le catalogue (ids 149 et 150, alignés sur
ceux de BetsRank). Deals PayKassma Partners, 250 € de CPA chacun, dépôt minimum
20 € et 15 €.

**Le champ `providers` décide sur quelles fiches de jeu un casino apparaît.**
Le laisser vide l'aurait rendu invisible ; le remplir de mémoire l'aurait
affiché sur des jeux qu'il ne propose pas. Leur API range pourtant ses jeux par
`supplier` — un entier maison, sans nom : 77, 91, 141…

On a donc rapproché les titres qu'ils affichent de **notre propre table `Jeu`**,
11 658 jeux dont on connaît le studio. Chaque entier s'est fait identifier par
le consensus de ses jeux :

| supplier | jeux reconnus | studio |
|---|---|---|
| 91 | 19 / 19 | Spinoro |
| 141 | 7 / 7 | Turbogames |
| 88 | 5 / 5 | Spinomenal |
| 45 | 5 / 5 | BGaming |
| 70 | 4 / 4 | Platipus |
| 39 | 3 / 3 | Reevo |
| 140 | 3 / 4 | TaDa Gaming |

**Felix est écarté malgré deux concordances** : ses fichiers portent le préfixe
`FG`, qui désigne Fugaso. Deux signaux qui se contredisent ne font pas une
certitude.

**Le clickId de ce réseau serait parti à la poubelle en silence.** PayKassma
livre ses liens avec `aff_click_id=YOURCLICKID` écrit en clair — un placeholder
qui ressemble à une macro sans en être une. Sans la branche ajoutée à
`url-partenaire.ts`, notre identifiant serait parti en `sub4` et le partenaire
aurait reçu « YOURCLICKID » pour chaque lead. Rien n'aurait cassé, rien n'aurait
alerté : c'est le mode d'échec déjà payé deux fois chez BetsRank.

**Note de géo, vérifiée avant publication.** `spinmillion.com` résout sur
`offre-illegale.anj.fr` chez les FAI français — blocage DNS du régulateur, qu'un
navigateur en DNS-over-HTTPS ne voit pas. Notre lien n'est pas concerné : le
tracker atterrit sur `spinmillion757.com`, qui répond sur tous les résolveurs.
Ne pas « corriger » le `playUrl` vers le domaine de marque.

## 2026-09-15 — Le vrai gisement n'est pas les erreurs, c'est les trous

`frkn-bananas` était en base comme une grille **5×4 à 14 lignes** ; son panneau
dit « a **6-reel, 5-row** paylines game » et « The number of possible lines in
this game is **19** ». Sa table de gains publie un palier à **6 symboles**, ce
qu'une grille à cinq rouleaux ne peut pas avoir. Sixième grille corrigée du
chantier.

**Mais le lot Hacksaw a ouvert autre chose, et c'est plus gros que les
erreurs.** Quatre fiches sur huit décrivent **moins** que ce que leur jeu
publie : Eye of the Panda et Fire My Laser ont chacune un **second bonus** que
la base ignore ; Fred's Food Truck ne connaît ni ses rangées ni sa **cascade**,
pourtant décrite au panneau ; Get the Cheese résume ses bonus en une ligne
quand le jeu les nomme, les chiffre et publie un barème scatter entier.

**Mesuré sur les 2 484 fiches publiées :**

| champ | vide | part |
|---|---|---|
| volatilité | 1 494 | **60 %** |
| grille | 1 414 | 57 % |
| lignes ou ways | 1 415 | 57 % |
| mécaniques | 1 414 | 57 % |
| gain maximum | 1 291 | 52 % |

Et c'est le même classement que pour les dates : **Spinomenal, 1spin4win,
Wazdan, Amusnet, Habanero et Stakelogic** concentrent tout, quand Nolimit City
et Pragmatic sont à 93 champs vides chacun. Ce sont les catalogues importés
sans données — les mêmes qui n'ont aucune date de sortie.

Ces champs-là, **le panneau du jeu les publie**, et on les photographie déjà :
6 700 captures de règles dorment en base avec ces chiffres dedans. C'est le
chantier suivant, et il est plus rentable que la chasse aux erreurs — corriger
une fiche fausse répare une page, remplir une fiche vide en crée une.

**Une piste de nommage inventé à l'import**, à vérifier avant d'y toucher :
Feel the Beat annonce des « Spreading mystery symbols », terme que son panneau
n'emploie jamais — il décrit un symbole d'enceinte et un multiplicateur global.
Si c'est confirmé ailleurs, le défaut n'est pas dans une fiche mais dans la
méthode qui les a importées.

## 2026-09-15 — Misery Mining a deux RTP, pas un — et mon garde-fou avait raison par hasard

**Milky Ways** annonçait 5 664× en base ; son panneau dit **5 410×**, deux fois,
sur deux pages. Corrigé.

**Et une leçon sur la vérification elle-même.** Le 14/09, la campagne Stakelogic
avait signalé un écart sur Misery Mining — panneau « 96 » contre 96,09 en base —
que `resoudre-ecarts.ts` a classé « lecture tronquée » et que j'ai refusé
d'écrire : un entier là où la base a des décimales. **Le refus était bon, la
raison était fausse.** Le panneau publie en réalité une **plage** :

> « The theoretical return to the player for this game is 96.00% - 96.09%.
> 96.00%: achieved with Rat Mode, 96.09%: achieved with Mouse Mode. »

L'OCR lisait le **premier** nombre de la plage, pas une troncature de 96,09. La
fiche n'était donc pas fausse — elle gardait le mode optimal — mais
**incomplète** : un joueur qui choisit le Rat Mode joue à 96,00 %. La fiche
reçoit ses deux paliers et la mention des deux modes. C'est exactement la
précision qui fait la promesse du site.

**Deux captures « The base game » qui n'en sont pas**, portant à cinq le compte
depuis le début : Munchies photographié sur son **écran de choix de mode** (1 /
2 / 4 rouleaux, aucune grille), et Nine to Five sur un **chargement raté** — du
JSON de sprites brut affiché à l'écran. Toutes deux à recapturer.

## 2026-09-15 — Quatre de plus chez Hacksaw, et deux trous comblés

| fiche | en base | réel | preuve |
|---|---|---|---|
| Duel at Dawn | 11 064× | **15 000×** | annoncé deux fois : ABOUT THE GAME et la section MAX WIN |
| Duel at Dawn | 50 lignes | **19** | « The number of possible lines in this game is 19. » |
| Dynasty of Death | *vide* | **12 500×** | « The maximum achievable win in this game is 12 500 times your bet » |
| Eternal Duel | *vide* | **15 000×** | « a max win of 15 000 times your bet » |

Les deux derniers ne corrigent rien : ils **comblent des trous** que la base
admettait, avec un chiffre que le jeu publie lui-même. C'est le gisement le
plus simple du chantier — la section ABOUT THE GAME de ce studio donne la
grille et le plafond en une phrase, et il suffit de la lire.

**`epic-bullets-and-bounty` n'est pas un doublon de `bullets-and-bounty`**, et
c'est le panneau qui le dit : « This is the Epic version of Bullets and
Bounty… », avec quatre différences annoncées. Les maths diffèrent réellement —
RTP 96,24 % contre 96,27 %, et le barillet du Gamble n'a pas la même
répartition. Deux fiches légitimes.

Lot : **82 captures sur 82**, aucune omise, sept minutes par fiche. Et la
volatilité des menus d'achat a encore divergé de la fiche trois fois sur trois :
elle qualifie l'achat, jamais le jeu, et n'apparaît dans aucune légende.

## 2026-09-15 — Cinq corrections d'un coup, dont une fiche qui se contredisait

Lot Nolimit City : **40 captures sur 40**, une minute par fiche. Et cinq
erreurs de base, toutes confirmées au mot près avant écriture.

| fiche | en base | réel | preuve |
|---|---|---|---|
| Immortal Fruits | 2 787× | **2 878×** | chiffres transposés ; la ligne est répétée sur deux pages |
| Kitchen Drama: Sushi Mania | 697× | **758×** | « Simulated maximum payout is 758 times the bet » |
| Infectious 5 xWays | **6 rouleaux, 20 lignes** | **5 rouleaux jusqu'à 8 rangées, 1 024 ways** | « A 5-reel, up to 8-row video slot » ; 5 colonnes comptées à l'image, plaque « 1024 WAYS » |
| Karen Maneater | 2-2-3-3-3-3 | **2-3-3-3-3-3** | la fiche annonçait elle-même 486 ways, or sa grille en donne 324 |

**Infectious 5 xWays cumulait deux erreurs de nature différente** : un rouleau
de trop, et surtout une **mécanique fausse** — le jeu paie en *ways*, pas en
lignes. C'est la cinquième grille corrigée du chantier.

**Karen Maneater est le second cas de fiche qui se contredit elle-même**, après
Beam Boys : elle publiait 486 ways et une disposition qui n'en donne que 324.
L'arithmétique tranche sans qu'on ait besoin du panneau — 2×3×3×3×3×3 = 486, le
compte exact de ce que le jeu décrit.

**Un signalement non tranché, honnêtement** : Jingle Balls annonce une grille
3-3-4-4-5-5 qui donnerait 3 600 ways quand son panneau dit « 144 win ways by
default ». La chaîne de décoration du jeu de base empêche de compter les
colonnes de façon fiable, et l'agent ne l'a pas tranché. À rouvrir avec une
capture propre.

Record du studio battu : **douze retours théoriques d'affilée** sur Kill 'Em
All. Aucun republié.

## 2026-09-15 — Book of Cats a six rouleaux et vend son bonus

**Deux erreurs sur la même fiche, et la seconde faisait mentir le site.**
`book-of-cats` était en base comme une grille **5×3 sans achat de bonus**. Son
panneau consacre une fonction entière au sixième rouleau — « In the main game
the 6th reel is locked except for one cell », « Then the symbol expands to
cover 3 positions on the 6th reel », « The game is played with the unlocked 6th
reel » — et sa table de gains porte une colonne « 6× ». Grille corrigée en
**6×3**, quatrième du chantier.

Et il vend bien son bonus : « There is a possibility to buy a bonus: round of
free spins », « RTP in the Buy Bonus feature is 96.83% », bouton « Buy bonus
9.70 FUN » visible sur la capture du jeu de base. Le drapeau passe à vrai et la
fiche gagne un **retour d'achat à 96,83 %** qu'elle n'avait pas.

**Deux jeux voisins qui n'en sont pas un seul**, vérifiés plutôt que supposés :
`book-of-cats` et `book-of-cats-megaways` ont des décors, des tables, des RTP
et une mécanique de gamble différents — deux fiches légitimes. Même conclusion
chez Hacksaw pour `donny-and-danny` et `donny-dough`, qui ne partagent qu'un
personnage. **Savoir quand ne pas supprimer vaut autant que trouver un
doublon.**

**Trois signalements laissés en l'état, faute de preuve suffisante** :
- `big-atlantis-frenzy` affiche un achat à 80× la mise et un Chance à +100 %
  quand la fiche annonce 50× et +50 % — mais le panneau ne chiffre ni l'un ni
  l'autre, et un prix d'écran a déjà été démenti par son propre règlement sur
  ce studio.
- `candy-monsta` : le panneau parle d'une « maximum exposure of x1000 », qui
  **n'est pas un gain maximum**. La fiche a probablement raison avec ses
  2 077× ; c'est noté pour que personne ne l'aligne sur le x1000 plus tard.
- `burning-chilli-x` publie **cinq** RTP selon le nombre de lignes choisi, la
  fiche n'en garde qu'un. Juste mais incomplet : un `rtpPaliers` le dirait
  mieux.

Lot BGaming : **102 légendes sur 103 captures**, la seule omise étant une
capture « Buying the feature » qui ne montre aucune fenêtre d'achat.

## 2026-09-15 — Troisième tour : 154 fiches écrites, quatre corrections de plus

**1 143 captures écrites à la main, 6 % du site.** Deux lots de plus : Nolimit
City à 4 minutes la fiche — quatre fois l'estimation, la lecture des images
étant le poste incompressible — et Stakelogic à 1 min 30, **87 captures sur 87**
sans une omission.

**Quatre corrections, chacune vérifiée avant écriture :**

| fiche | en base | réel | preuve |
|---|---|---|---|
| Dice Runner Megaways | RTP **96** | **95,99 %** | lu à l'image : « The theoretical minimum payback percentage (RTP) is 95.99% » |
| Golden Genie | 9 583× | **9 584×** | « Simulated maximum payout is 9584 times the bet » |
| Golden Genie | lignes « Not confirmed » | **20 win lines** | « 20 win lines (see pay table for more info) » |
| Hot Nudge | lignes « Fixed (number not confirmed) » | **40 bet lines** | idem |

Le premier est le plus parlant : **96 tout rond est un arrondi d'import**, et
c'est le chiffre sur lequel repose toute la promesse du site. Les deux derniers
comblent des trous que la base admettait elle-même.

**Deux pistes non retenues, faute de preuve** : un agent annonçait 5 lignes de
gain chez Gaelic Gold contre « Up to 9 » en base, mais la page de règles de
cette fiche est capturée à une position où le texte n'apparaît pas — rien à
lire. Et il soupçonnait Hot 4 Cash de déclarer un achat de bonus inexistant,
parce que son panneau n'aligne qu'un seul retour théorique là où les jeux à
achat de ce studio en listent un par achat : c'est un indice sérieux, pas une
preuve, et le drapeau reste tel quel.

**Un outil affûté au passage** : l'extracteur OCR de vérification groupait mal
son alternance (`a|b|c` au lieu de `(?:a|b|c)`), ce qui coupait la phrase avant
le chiffre — il rendait « win lines » au lieu de « 20 win lines ». Corrigé, il a
confirmé trois valeurs dans la foulée.

**Deux coquilles de studio relevées, décrites sans commentaire** : chez
Stakelogic, la ligne SINGLE WIN LIMIT de deux jeux recopie mot pour mot le texte
de LOSS LIMIT et parle donc de pertes au lieu d'un gain ; et Dynamite Strike
imprime deux fois la même règle sur une page.

## 2026-09-15 — Les dates de sortie : 65 % manquent, et la source est chez le studio

**1 622 fiches publiées sur 2 483 n'ont aucune date de sortie.** Quatre studios
n'en ont pas une seule — Spinomenal 412, 1spin4win 219, Stakelogic 107 — et
Amusnet, Habanero, Wazdan dépassent 95 % de manques. Ce sont les catalogues
importés sans date. Conséquence directe : la page des nouvelles sorties, celle
dont le contenu bouge et qui vaut donc le plus au référencement, **tourne sur un
tiers du stock** ; un jeu paru cette semaine chez Spinomenal ne peut pas y
apparaître.

**La source est le studio lui-même.** `nolimitcity.com/games/<slug>` porte un
`__NEXT_DATA__` dont
`props.pageProps.initialState.cmsApi.queries['getPopulatedGameBySlugV2(…)'].data`
donne `name` et **`releaseDate`** en ISO. Mesuré : Duck Hunters 2 →
`2026-09-10`. La page `/games` expose en plus `latestGame`, la dernière
parution du studio — de quoi savoir quand un catalogue bouge sans le sonder
entier.

**Deux impasses vérifiées, notées pour qu'on ne les refouille pas** : les pages
produit de Spinomenal (`spinomenal.com/<slug>/`) et d'Amusnet
(`amusnet.com/games/online-casino/<slug>`) ne portent aucune date dans leur HTML
servi. Les panneaux de règles des jeux n'en portent jamais.

**Deux règles pour ce chantier.** Jamais d'agrégateur concurrent : leurs dates
ne sont ni vérifiables ni à nous, et le projet a déjà payé d'avoir pointé 590
boutons de démo vers l'un d'eux. Et **une date de build de CDN n'est pas une
date de sortie** — les horodatages qui traînent dans les URL de bundles sont
celles du dernier déploiement.

Première date posée à la main : Duck Hunters 2, sur la foi du `releaseDate` du
studio.

## 2026-09-15 — Un doublon de catalogue, et la première 301 du site

**`east-vs-west` et `east-coast-vs-west-coast` sont le même jeu Nolimit City**,
sur le même lanceur : quatre captures identiques image pour image, même RTP
96,04, même plafond 30 618×, prises à deux minutes d'écart. Deux pages
indexables pour un seul jeu — la règle des doublons du projet dit d'en garder
une seule.

**Et c'est la première fois qu'on ne peut pas simplement supprimer.** Tant que
rien n'était indexé, retirer une fiche ne coûtait rien ; depuis la soumission à
Search Console le 12/09, une URL supprimée devient une 404 que Google met des
semaines à digérer. La fiche appauvrie est donc dépubliée (ses captures
retirées, sauvegardées) **et une 301 posée dans les trois langues** vers celle
qu'on garde — la seule des deux à porter grille, volatilité et mécaniques. Le
`next.config.js` du site n'avait aucune redirection jusqu'ici : la liste des
doublons y est désormais un tableau, prêt pour les suivants.

**Trois corrections de plus, toutes vérifiées par OCR verbatim avant écriture :**

| fiche | en base | réel |
|---|---|---|
| Dragon Tribe | 27 000× | **26 914×** (deux captures) |
| Dungeon Quest | 450× | **454×** |
| Duck Hunters | grille 5×5 | **6 rouleaux × 5 rangées** |

Les deux premiers sont le même défaut : un chiffre arrondi vers le rond, comme
les plafonds Pragmatic à 10 000× documentés chez BetsRank. Le troisième est le
second cas de grille fausse en deux jours, après Dead Men Walking.

Un record au passage : **Duck Hunters 2 aligne vingt retours théoriques** sur
une seule page de son panneau, dont neuf fourchettes. Aucun n'a été republié.

## 2026-09-15 — Second tour : 52 fiches de plus, et quatre corrections vérifiées

Cinq agents, un studio chacun. **429 légendes écrites à la main** sur ce tour,
Hacksaw et BGaming livrant 106 et 111 captures sans une omission. La cadence
dépend du studio, pas de l'agent : une minute par fiche chez Nolimit City (4
captures), **neuf minutes chez Hacksaw** (9 à 11 vues par panneau).

**Quatre corrections passées en base, chacune vérifiée à l'image ou par OCR
verbatim avant d'y toucher :**

| fiche | en base | réel | preuve |
|---|---|---|---|
| Circle of Life | 10 000× | **15 000×** | « a max win of 15 000 times your bet », deux fois dans le panneau |
| Chaos Crew | 19 lignes | **15** | « The number of possible lines in this game is 15. » |
| Bullets and Bounty | *aucun plafond* | **20 000×** | annoncé au panneau, la fiche avait un trou |
| Adventures | grappes de 5+ | **4 et plus** | « 4 or more same symbols », et la table commence au palier 4-5 |

**Deux corrections refusées, et c'est le plus instructif.** Un agent rapportait
deux RTP Stakelogic à corriger — Apes of Doom 95,52 → 96,00 et Bonus Runner
95,98 → 95,00. Vérification faite, **la ligne du taux ne figure dans aucune des
captures téléchargées** : la valeur venait de l'OCR de la campagne, que
`resoudre-ecarts.ts` avait déjà classée « illisible » à la seconde lecture. Et
les deux sont des **entiers là où la base a des décimales** — exactement le
motif de troncature contre lequel le script se garde. Rien n'a été écrit.

C'est la règle qui vaut pour tout ce chantier : **un rapport d'agent est une
piste, pas une preuve.** Cinq corrections sur sept ont tenu à la vérification,
deux non.

**Autres écarts signalés, laissés en l'état faute de preuve suffisante** : le
gain maximum d'Avalon the Lost Kingdom (3 812× en base, absent de ses onze
captures — c'est une absence, pas une contradiction, mais la légende générée
l'affirmait « annoncé par le jeu lui-même », ce qui était faux et ne l'est
plus) ; les multiplicateurs Cerberus d'Adventures (×999 en base, ×11 à ×1800 au
panneau) ; et les plafonds publiés par Atlantis Gold et Big Sugar Bonanza Xmas,
absents de leurs fiches.

## 2026-09-15 — Ce que les légendes écrites à la main ont trouvé

Quatre agents ont écrit à la main les légendes de 21 fiches — 173 captures,
trois langues chacune. Le travail lui-même tient la cadence : **cinq à sept
minutes par fiche**, l'essentiel passé à regarder les images. Mais ce qu'ils
ont vu en regardant vaut plus que les légendes.

**29 captures « Buying the feature » étaient l'image du jeu de base.** Le
bouton « BUY FREE SPINS » est peint en permanence dans l'habillage Pragmatic,
même sur les jeux qui ne vendent rien : le contrôle `/BUY/i` de l'adaptateur
passait partout, le clic n'ouvrait rien, et le runner photographiait le jeu de
base une seconde fois. Comparaison d'images sur les **556 fiches publiées** qui
ont une capture d'achat : 29 doublons (écart de luminance < 3 sur 255), toutes
chez Pragmatic, dont **22 sur des jeux sans achat de bonus du tout**. Deux fois
faux pour le visiteur — la même image deux fois sur la page, la seconde
légendée « la confirmation d'achat ». Les 29 captures sont retirées
(`scripts/retirer-achats-fantomes.ts`), et l'adaptateur exige désormais que
l'écran ait **changé** après le clic, pas qu'un bouton porte le mot BUY.

**Trois chiffres faux en base, trouvés en lisant les panneaux :**

- **5 Lions Gold** — la fiche annonçait un jackpot Major à 250× ; le panneau
  dit **150×**, et l'arithmétique du bandeau le confirme (270 $ pour 1,80 $ de
  mise). Les deux autres jackpots, eux, correspondaient exactement.
- **5 Lions Megaways** — 200 704 ways en base, **117 649** au panneau, et
  7⁶ = 117 649 pour six rouleaux de sept symboles.
- **Beam Boys** — 6 561 ways en base pour une grille que **notre propre fiche**
  décrit en 6 rouleaux × 4 rangées : 4⁶ = **4 096**, ce que le panneau écrit.
  6 561 était arithmétiquement impossible.

**Un quatrième, trouvé sur le second lot** : Bonus Bunnies annonçait 6 950× en
base quand son panneau écrit « Simulated maximum payout is 6925 times the
bet ». Corrigé à 6 925.

**Un cinquième, et c'est le plus gros** : Dead Men Walking était décrit en base
comme « 6 rouleaux, variable » quand son panneau dit **« A 5-reel, 3-row video
slot »** et **« 17 win lines »** — la capture du jeu de base confirme cinq
colonnes, la sixième bande étant le couloir du condamné, pas un rouleau.
Corrigé.

Tous cinq corrigés, sauvegardes dans `sauvegardes-betsrank/`.

**Deux captures « The base game » ne montrent pas le jeu de base** : Brick Snake
2000 photographié sur son écran d'intro, Brute Force: Alien Onslaught sur un sas
fermé pendant le chargement. Les agents ne les ont pas écrites plutôt que
d'inventer une grille ; leur `demoUrl` est à recapturer avec un délai plus long.
Un troisième cas, Beheaded, avait été signalé au premier lot.

**Et un piège que les agents ont évité seuls** : les menus d'achat de Hacksaw
affichent une volatilité — « High », « Very high », « Medium » — qui qualifie
**l'achat**, pas le jeu, et qui diverge de la fiche cinq fois sur cinq. Aucune
légende ne l'a reprise. Même discipline sur les retours d'achat de Nolimit City
et de Hacksaw : toujours nommés « retour d'achat », jamais confondus avec le
RTP du jeu, qui vient de la fiche.

## 2026-09-15 — Les légendes écrites à la main, en base et par langue

La légende générée dit de quoi une page **parle** — c'est vrai, jamais faux, et
c'est déjà du texte propre à chaque page. Elle ne dit pas ce que la capture
**montre** : la grille, le prix de l'achat à l'écran, les trois paliers de la
table de gains, la bombe multiplicatrice qui n'existe qu'en tours gratuits.
Gates of Olympus a ces légendes-là, écrites en regardant les images. C'est le
niveau qu'on veut partout, et il faut les écrire à la main.

**Elles vivent désormais dans la capture, pas dans le code.** `LEGENDES_ECRITES`
tenait pour une fiche ; pour deux mille cinq cents, ce serait un fichier
TypeScript de plusieurs mégaoctets et **chaque virgule corrigée demanderait un
déploiement**. Rangées dans `captures[].legendes`, elles se publient par un
`upsert` et paraissent à la revalidation suivante, sans build. Trois langues
séparées : le champ `legende` historique n'en portait qu'une, et 1 759 captures
ont ainsi servi de l'anglais aux visiteurs français et allemands.

Elles gagnent sur tout le reste, y compris sur une page que l'OCR sait lire —
quelqu'un a regardé l'image. Une langue pas encore écrite laisse la lecture
reprendre la main, et une forme inattendue vaut « pas de légende écrite »,
jamais une fiche en 500. Le marquage « Suite de la page précédente » les
épargne déjà : deux pages écrites à la main ne sont la suite de rien.

**`scripts/legendes-a-la-main.ts`** — `--fiche <slug>` télécharge les captures
en PNG lisibles et imprime les faits vérifiés de la fiche ; `--ecrire <json>`
les publie, sauvegarde faite. La règle de rédaction est dans l'en-tête du
script : les chiffres **du jeu** viennent de la fiche, jamais de l'image ; les
chiffres **de l'image** se recopient s'ils sont nets et se taisent sinon.

**Première fiche écrite : Sweet Bonanza**, huit captures. Un cas d'école y est
apparu : la page 4/7 affiche « LOW VOLATILITY » quand notre fiche dit haute.
C'est le classement du studio, pas une mesure — la légende n'en parle pas
plutôt que de publier une contradiction.

## 2026-09-15 — Habanero : 198 fiches sur 202, zéro échec

La campagne Habanero est le passage le plus propre du rush : **198 publiées sur
202 exploitables, aucun échec**, le RTP lu dans le Help à chaque fois — y
compris les plages (5 Lucky Lions, 96,51-96,79 %, haut de plage retenu comme
défaut) et les noms à chiffre (12 Zodiacs, 5 Mariachis) qui faisaient rendre
`null` au lecteur la veille. Le studio n'avait **6 RTP en base** : ce sont
donc ~195 fiches qui reçoivent leur taux en source studio et deviennent
publiables d'un coup. Trois écarts signalés sur les fiches qui avaient déjà un
taux, non écrits.

Le catalogue passe à **2 472 fiches publiées** — 1 187 le 12/09 au soir.
Yggdrasil a pris le relais dans la même tâche détachée pour la nuit.

## 2026-09-14 — Amusnet : 214 fiches publiées, et le WebGL qui chauffe le poste

La campagne Amusnet a publié **214 fiches sur 252** en deux passages : 41 avant
qu'elle soit relancée, 173 après. Le RTP est lu à chaque fois — « The average
return to Player of the game is 96.48% » — depuis que le lecteur connaît la
phrase. Deux écarts OCR laissés à trancher (5 Glossy Dice à 0,01 près, Secrets
of Cairo 96,1 → 96,53).

**Le poste est monté à `load 41`** au milieu du premier passage, 48 jeux en
1 h 40 et les échecs qui montaient. Ce n'était ni un agent ni une fuite de
pages — le runner ferme les siennes sur tous les chemins, relu. C'est le
**processus GPU de Chromium** : les jeux Amusnet sont en WebGL, et en mode sans
tête il est rendu **en logiciel** (SwiftShader), huit cœurs le temps d'un jeu.
S'y est ajouté un rendu resté coincé depuis le lancement. Relancée avec un
navigateur neuf, la campagne reprend au marque-page et tient à `load 7`. À
garder en tête pour les studios en WebGL : le sans-tête coûte du CPU, pas
seulement du temps.

**38 échecs systématiques**, dont les jeux « dice » (20 Power Hot Dice, 20
Super Dice, 27 Wins, 5 Glossy Dice…) : un autre habillage, « icône des règles
introuvable » à chaque passage, poste calme. À reconnaître à part.

**Habanero puis Yggdrasil sont enchaînées dans une seule tâche détachée** :
la première publie dès la capture (RTP lu dans le Help), la seconde impose deux
minutes de pause par lot à cause du ban Cloudflare et prendra la nuit. Aucun
agent n'est plus lancé : la limite de session tombe en moins d'une heure avec
plusieurs agents en parallèle, et les campagnes n'en ont pas besoin.

## 2026-09-14 — Nolimit City : 135 publiées, six taux alignés sur le DOM

La campagne Nolimit City a publié **135 fiches sur 142**, un échec, le
meilleur taux de tous les studios — le RTP est lu dans le DOM du panneau
(`li.rtp`), en texte exact, pas en OCR. Sept écarts avec la base ont été
signalés sans être écrits, comme le runner le fait toujours.

**Six sont alignés sur le panneau**, parce qu'ici la lecture n'est pas une
lecture : c'est la phrase du studio, au caractère près. Deux bases portaient
une **variante réduite** (East Coast vs West Coast à 94 pour un panneau à
96,04, San Quentin xWays à 94,11 pour 96,03 — les taux officiels par défaut) ;
les quatre autres diffèrent au centième, le panneau étant plus précis (96 →
96,01) ou simplement autre (96,03 → 95,99). Sauvegarde des valeurs d'avant
dans `sauvegardes-betsrank/`, source notée « panneau de règles (DOM, li.rtp) ».

**Misery Mining reste à 96,09** : le panneau rend « 96 », un entier face à des
décimales — le même signal de troncature que Wolf Gold la veille, et la règle
vaut aussi pour une lecture DOM tant qu'on n'a pas vu la ligne à l'écran.

`scripts/resoudre-ecarts.ts` ne voit pas ces écarts-là : il retrouve un
écart par la légende qui porte le taux lu à l'OCR, et Nolimit ne passe pas
par là. À garder en tête pour les studios lus au DOM.

## 2026-09-14 — TaDa : capturable sous Firefox, mais sa démo n'affiche aucun RTP

`src/lib/captures/adaptateur-tada.ts`, et une capacité nouvelle du runner :
**un adaptateur peut exiger Firefox**. TaDa protège son code avec JScrambler,
qui détecte le domaine CDP `Runtime` de Chromium piloté — reproduit mot pour
mot : `load` à 3,9 s, « Code violation j-016-00079 » à 25 s, globaux retirés,
`evaluate` cassé, écran figé sur la barre de chargement. Sous Firefox le même
jeu se charge et se pilote. Le jeu se conduit par le **graphe de scène Cocos**
(`window.cc` exposé, chaque bouton est un nœud nommé) et non par des
coordonnées : paysage et portrait passent par la même voie.

**Mais la démo n'affiche aucun RTP.** Zéro occurrence dans les 5 000
caractères du panneau, sur trois générations de jeux. La cause est dans le
réseau : `IsRtpItemDisplay: false` — l'opérateur de démo a éteint l'affichage.
Le composant existe, sa phrase est prête (« RTP = {txt0} »), l'API répond même
deux valeurs (0,9606 certifiée, 0,9708 non) ; mais ce n'est pas un chiffre
affiché, donc on ne l'écrit pas. Et aucune des 233 fiches n'a de RTP en base :
**une campagne ne publierait rien**. L'adaptateur est branché, hors de la file,
à relancer le jour où une source de RTP existe. Recensement sur 39 jeux : ~130
machines à sous capturables, ~24 builds qui plantent sous tout navigateur, ~78
qui ne sont pas des machines à sous (tir, bingo, keno, plinko).

## 2026-09-14 — Amusnet : le panneau s'ouvrait, c'est le témoin qui refusait

La simulation du matin donnait **1 jeu sur 3**, poste calme. L'adaptateur n'a
jamais échoué à ouvrir le panneau — la sonde rejoue le runner et montre le
même enchaînement sur les trois jeux, jusqu'à la ligne « The average return to
Player of the game is 95.94% », conforme à la base. Le rejet venait du
**contrôle final du runner** : aucune vue ne portait `EN_TETE_PANNEAU`. Amusnet
n'écrit ni RTP, ni GAME RULES, ni PAYTABLE ; sa seule alternance présente est
« Malfunction voids all pays and plays », au milieu de la descente, dans un
paragraphe de 384 px que la molette franchit par crans de 500 en ne
photographiant qu'un cran sur quatre. Selon le jeu, la phrase tombait sur une
vue ou dans une coupe — d'où 1 sur 3, qui n'était pas du hasard.

**Deux corrections.** L'adaptateur demande désormais au DOM du panneau (un
iframe HTML, pas du canvas) où en est le paragraphe témoin, l'aligne, et prend
une vue hors cadence. Et le témoin reçoit **« RETURN TO PLAYER »** : sur les
deux *Bulky Fruits*, la clause de nullité se **replie sur deux lignes**, et
l'OCR intercale le bruit des boutons latéraux entre ses moitiés — « voids (=
all » — donc aucune position de défilement n'y remédie. Le titre « Return to
Player », lui, ferme chaque panneau du studio sur sa propre ligne. **Un
mot-témoin n'est fiable que sur une ligne à lui.**

Le lecteur apprend la formulation, « The average return to Player of the game
is 96.17% » — la variante Wazdan exigeait « Game average… ». « of the game »
écarte la ligne voisine « when using <feature> is », le taux d'un achat. Tests
à l'appui. Simulation : **4 jeux sur 6** avant le témoin élargi, 6 attendus
avec. 252 fiches, 264 sur 280 avec leur RTP.

## 2026-09-14 — 46 noms Habanero remis comme le jeu les écrit

Les noms Habanero avaient été dérivés du slug : « Jacksor Better50 Hand » pour
Jacks or Better, « Queen of Queens1024 » pour Queen of Queens II, « Zeus2 »,
« Sos » pour S.O.S!, « dr Feelgood ». Ces noms partent dans le titre de la
page, dans la recherche et dans les données structurées — c'est ce que Google
affiche.

La reconnaissance de l'adaptateur a relevé, pour les 222 lanceurs, **le nom
tel que le jeu l'affiche à l'écran** (scratchpad `hab/noms.tsv`). Là où il
diffère du nom en base et n'est pas vide, la base l'adopte : 46 fiches, slug
inchangé, donc aucune URL ne bouge. Sauvegarde des 46 valeurs d'avant dans
`sauvegardes-betsrank/`. Les fiches dont le lanceur n'affichait pas de nom
(Azlands Gold, Caribbean Holdem…) restent telles quelles : on ne corrige que ce
qu'on a lu.

## 2026-09-14 — Habanero branché, et un audit de chaque fiche publiée

**Habanero** — `src/lib/captures/adaptateur-habanero.ts`. 222 fiches avec démo,
**6 RTP en base** : la lecture du panneau est leur seule voie vers la
publication. Lanceur direct `app-test.insvr.com`, sans tête, aucun blocage sur
222 requêtes et ~35 chargements. Seules les clés `SG` (202 slots) sont prises ;
les 20 tables et vidéo-pokers n'ont ni menu ni section RTP et sont écartés en
clair. Le Help est du HTML, ouvert par l'API du jeu ; la section « Return To
Player (RTP) » dit **« The theoretical RTP for Hot Hot Fruit is 96.84% »**.

Deux pièges dans cette phrase, tous deux réglés dans le lecteur de règles et
verrouillés par des tests. **Le nom du jeu y est**, et il commence parfois par
un chiffre — 5 Lucky Lions, 12 Zodiacs, Zeus 2 — où la règle générale
s'arrêtait et rendait `null`. **Et la plage** s'écrit « 96.51% - 96.79% », avec
un % après chaque nombre, forme que la règle de plage de BGaming ne voyait
pas : la règle générale rendait alors le **bas**, publié comme défaut, sans
écart possible puisque la fiche n'a pas de taux — le chiffre faux en source
studio, le pire cas du site. Le haut est le défaut du lanceur (`GameRTP`), le
bas un palier.

Un garde-fou de plus, dans l'adaptateur : cinq jeux n'ont **aucune ligne
inconditionnelle** (« 96.03% if Green Jelly Mode is selected »). L'adaptateur
relit la première ligne et refuse, nommé, si le taux du lanceur n'y figure
pas — plutôt que de publier le taux d'un mode comme celui du jeu.

À corriger en base, pas ici : **une trentaine de noms** dérivés du slug ont
perdu leur apostrophe (« Azlands Gold » pour Aztlan's Gold) ou leur suffixe
(« Queen of Queens 1024 » pour Queen of Queens II). Relevé complet dans le
rapport de reconnaissance.

**`scripts/auditer-fiches-publiees.ts`** — depuis que Google crawle, une fiche
douteuse en ligne coûte plus qu'une fiche absente. La publication est décidée
par une règle et validée par des heuristiques ; ce script regarde **chaque
capture publiée** avec un œil de robot : écran quasi uniforme (écart-type de
luminance sous 12), image trop petite ou trop légère, fiche sans page de
règles, RTP ou gain max hors de toute plausibilité, légendes en double. Il
n'écrit rien et rend la liste de ce qu'un humain doit regarder.

## 2026-09-14 — Chromium ne demande plus le mot de passe du trousseau

En pleine campagne nocturne, macOS a affiché « Chromium veut accéder au
trousseau » et demandé le mot de passe de session au propriétaire. C'est
Chromium qui range dans le trousseau la clé de chiffrement de ses cookies —
normal pour un navigateur, absurde pour un robot qui photographie des pages
sans jamais avoir besoin d'un cookie. Refuser ne cassait rien, mais une boîte
système qui réclame un mot de passe à minuit est une question qu'on ne doit
pas poser. Le runner lance désormais Chromium avec un trousseau factice
(`--use-mock-keychain`, `--password-store=basic`).

## 2026-09-13 — Yggdrasil, une fédération de moteurs ; trente écarts tranchés

**Yggdrasil n'est pas un studio, c'est une trentaine de moteurs** sous une
même marque : Reel Play 76 jeux, iSense 64, Bulletproof 33, GATI 16, Vue 11,
et 30 démos retirées (403 S3). L'agent a lu l'`index.html` des 445 lanceurs
pour le savoir, plutôt que d'en déduire un habillage de trois jeux.
`src/lib/captures/adaptateur-yggdrasil.ts` prend en charge **GATI et Reel
Play** — panneau HTML, RTP lisible au chiffre —, détecte le moteur à
l'exécution et **nomme** les autres dans le journal (« moteur Bulletproof, pas
encore pris en charge », « démo retirée ») au lieu de les faire échouer en
« icône introuvable ». Pour ce studio, lire le taux n'est pas un bonus : 457
fiches, 36 RTP en base — c'est la seule voie vers la publication.

**Le ban est mesuré, pas supposé** : `demo.yggdrasilgaming.com` est derrière
Cloudflare et **trois chargements en 65 s** valent une heure de 429 sur tout
l'hôte, `retry-after` exact. Le runner ne peut pas le voir — des XHR sans CORS
finissent en écran noir — donc l'adaptateur écoute les 429, fait une requête
de contrôle quand le jeu ne répond pas, et lève `LimiteDeDebit`. Deux minutes
de pause entre les jeux. `PARALLELE = 2` du runner est à lui seul la moitié
du déclencheur.

**Le piège des variantes** : la démo Reel Play sert parfois un **RTP réduit**
(94,0 quand la fiche produit dit « 96 %, 94 %, 90.5 % »), et le lanceur le
déclare (`rtp_variant_active`). L'adaptateur le relit et refuse : un 94,0 lu
dans une démo bridée, écrit en source studio, serait un mensonge signé.

Le lecteur apprend deux formulations : GATI, « The overall theoretical return
to player is 96.0% » — mot pour mot le corps de texte d'Evoplay, que seul son
bandeau sauvait —, et Reel Play, « The Theoretical Average Return to Player
is: 94.0% ». Un test vérifie qu'aucune n'attrape « when using BUY BONUS is ».

**Trente écarts panneau/base tranchés.** `scripts/resoudre-ecarts.ts` relit
chaque capture porteuse du taux une seconde fois, plein cadre à double
résolution, et n'aligne la base que si les deux lectures tombent au même
chiffre : 30 confirmés, 9 illisibles laissés, 0 infirmé. Vingt-deux sont des
Pragmatic dont la base portait la norme maison 96,5 et dont le panneau dit
96,03 ou 96,08 — la valeur non ronde est celle qu'on garde. Un garde-fou de
plus : **un entier là où la base a des décimales est une lecture tronquée**,
pas une correction. Wolf Gold, base 96,01, panneau « 96 » lu deux fois — les
deux lectures ont perdu les mêmes décimales dans la même image. Écarté, avec
Wisdom of Athena 1000.

## 2026-09-13 — Spinomenal, le plus gros stock, a son adaptateur

**633 fiches, 554 avec leur RTP** : le plus gros stock capturable du catalogue.
`src/lib/captures/adaptateur-spinomenal.ts`, écrit par un premier agent coupé
par la limite de session, **relu et éprouvé par un second** — qui a fait tourner
l'adaptateur lui-même sur onze jeux couvrant chaque habillage avant la
simulation du runner : 7 jeux sur 7, de 4 à 10 captures.

La `demoUrl` est la fiche produit du studio, dont l'iframe frappe un jeton frais
à chaque chargement : on lit son `src` dans la page rendue, jamais dans le HTML
brut, puis on y navigue plein cadre. Sans tête, ça passe — pas de Cloudflare,
pas de page marketing servie à un « Headless ».

**Deux moteurs sous la même enveloppe.** Le récent a un ruban HTML ; l'ancien
(Construct 2) peint tout dans le canvas et son « ? » **bouge selon
l'habillage** — cinq positions relevées sur cinq familles de jeux. D'où le
bouton HTML d'abord, puis des candidats ordonnés par la famille lue dans le
`gameCode`, et **un seul juge** : la hauteur DOM du panneau, commun aux deux
moteurs.

**Le défaut trouvé par la relecture** : `boundingBox()` attend trente secondes
un élément absent, et le bouton d'achat n'existe pas sur l'ancien moteur. Un
jeu ancien coûtait **86 s** au lieu de 25. Sur ~330 fiches, c'est cinq heures
de campagne rendues.

**Aucun panneau n'écrit le RTP** — vérifié dans le DOM de neuf jeux, deux
moteurs, zéro occurrence de « RTP », « return to player » ou d'un pourcentage.
Le studio publie ses taux sur la fiche produit, déjà lue. La campagne apporte
donc les images ; la fiche garde son taux, et un écart panneau/base ne pourra
jamais être signalé pour ce studio.

À réparer côté données, pas côté adaptateur : **13 fiches en `cdn-newdev`**
répondent « Error 9989 » et échoueront en clair à chaque campagne.

## 2026-09-13 — Stakelogic et Nolimit City branchés ; la relecture mesurée

**La relecture complète a tourné : 10 144 pages, 7 223 identifiées, 2 920
muettes.** Le taux de légendes génériques servies passe de **60 % à 34 %** en
une passe (Wazdan 63 → 21 %, Hacksaw 65 → 27 %, Pragmatic 60 → 37 %, Play'n GO
72 → 47 %, BGaming 81 → 51 %). Vérifié en ligne : Mighty Wild: Panther, qui
servait dix-sept fois la même phrase le matin, sert dix-sept phrases
distinctes. 1spin4win « remonte » de 9 à 29 % : ses 647 pages faussement
étiquetées « mentions de fin » sont redevenues honnêtement génériques, ce qui
était le but. Ce qui reste muet est, pour l'essentiel, de la prose propre à un
jeu — des héros, des boss, une matrice — et des tables de gains faites
d'images : on ne l'apprendra pas par formulation.

**Stakelogic** — `src/lib/captures/adaptateur-stakelogic.ts`, écrit par un
agent coupé par la limite de session juste après l'avoir fini, validé ici en
simulation : **3 jeux sur 3, 9 à 10 captures chacun**. Lanceur direct, sans
tête ; une couche HTML sur le canvas où chaque bouton porte un `btnname`, les
classes étant générées. Seule la génération moderne est prise (`gameId` à
cinq chiffres et plus) : les 50 jeux de l'ancienne plateforme GWT n'ont pas de
RTP dans leur DOM et sont écartés en clair plutôt que d'échouer un par un en
« icône introuvable ». Le voile « ENABLE SOUNDS? » dit que le jeu est prêt —
mesuré de 2,5 à 41 s selon la charge, donc pas de délai fixe. La boîte
« SUPER STAKE » reçoit NO : activée, elle double la mise et change de mode de
jeu. **143 fiches, toutes avec leur RTP** : publiables dès la capture.

Le lecteur apprend sa formulation, « The theoretical minimum payback
percentage (RTP) is 96.02% » — le sigle est là mais « minimum » précède
« payback » et la règle générale s'arrêtait avant. Test ajouté.

**Nolimit City** rejoint le registre avec l'adaptateur commité juste avant.

## 2026-09-13 — Nolimit City n'est pas Red Tiger, et il a son adaptateur

Le CHANGELOG du 12/09 disait que Nolimit City « tourne sur la plateforme de
Red Tiger et NetEnt ». C'est vrai de la **page hôte seulement** : même
document Next.js multi-tenant, même porte d'âge. Mais le jeu ne passe jamais
par `fansite.evo-games.com` — il vient du lanceur propre du studio, en PixiJS,
depuis `demo.nolimitcdn.com`. Branché sur l'adaptateur Red Tiger, le studio
échouait trois fois de suite : `demoUrl` écartée, cadre jamais reconnu, puis
un **faux ban** au bout de 75 s. Mesuré sur douze ouvertures en trente minutes,
toutes servies en 200 : le compteur d'Evolution n'est pas dans la boucle, et
Akamai non plus — Nolimit se capture **sans tête**.

`src/lib/captures/adaptateur-nolimit-city.ts` : commandes cliquées en
proportion de la boîte du canvas (le jeu est dessiné en 1280×720 et mis à
l'échelle), et un menu qui, lui, est du HTML — « Game rules », « Pay table »,
« MAX WIN », plus la ligne du taux, lue dans `li.rtp:not(.rtp-feature)` pour
exclure les six taux d'achats de fonction listés juste dessous.

**Le piège payé** : `lireLesRegles` recadre l'OCR à partir de x=130, et
Nolimit écrit à x≈74 — l'OCR lisait « e rules » et « lfunction voids all
pays », et les quatre vues échouaient le garde-fou de publication. Résolu par
une feuille de style injectée dans le cadre, 120 px de marge à gauche du menu.

**Et le lecteur de règles apprend la formulation** : « The theoretical return
to the player for this game is 96.10% », sans le sigle. L'ancre est « for this
game is », parce que la même page dit « …when buying Nolimit Bonus is 96.44% »
dans la même tournure — attraper le premier nombre après « theoretical »
publierait le taux d'un achat comme celui du jeu. Un test le verrouille.

144 fiches, 145 avec leur RTP : publiables à la première capture. La ligne
dans `ADAPTATEURS` suit dans le commit qui branche Stakelogic — ce fichier est
le seul point où les agents se croisent, et l'un d'eux y a encore une ligne
de test.

## 2026-09-13 — La vignette du catalogue écrivait encore « 96.18% »

L'entrée précédente avait laissé `CarteJeu` de côté : la vignette d'un jeu —
celle de la page d'accueil, du catalogue, des pages studio, des nouveautés, des
démos, des « reviews », des favoris et des jeux voisins en bas de chaque fiche
— écrivait toujours le taux avec le point décimal, dans les trois langues. Un
visiteur français ouvrait une grille à « 96.18% » et, un clic plus loin, une
fiche à « 96,18 % ».

La vignette est un composant serveur : elle ne peut pas lire la langue dans
l'URL comme le font les composants clients. Elle la reçoit donc de la page qui
la pose — sept pages, une propriété chacune — et les deux grilles clientes
(« mes jeux », le catalogue par studio) la tirent de `useLangue()`, qu'elles
avaient déjà.

Le tour des autres nombres visibles a trouvé deux restes : les seuils du filtre
« RTP minimum » (`RTP 96.5%+`, en dur, pour les trois langues), et le mois qui
coiffe chaque groupe de « Dernières sorties », figé en anglais — « September
2026 » en tête des pages françaises et allemandes. Corrigés tous les deux. Le
texte d'analyse avait son propre formateur de taux, un `replace('.', ',')`, au
rendu strictement identique : il prend maintenant ses chiffres de `tauxLocal`
et ne garde que la décision de l'espace devant le signe, que l'anglais ne met
pas.

Laissés tels quels, et pourquoi : le JSON-LD reste au point décimal, c'est un
format machine, pas un texte ; l'image de partage est un autre sujet ; le
plafond de gain de la fiche passait déjà par la locale. Les compteurs
(« 1090 jeux ») n'ont ni point ni virgule à corriger, mais ils ignorent le
séparateur de milliers — à trancher à part. Et `legendes.ts` garde une copie
privée de la table des locales, aux mêmes valeurs : elle n'est pas fausse,
juste dupliquée.

## 2026-09-13 — Ce qui reste muet après la relecture, appris

Au départ du chantier, **60 % des 11 378 légendes servies étaient génériques**
(mesuré par `scripts/mesurer-legendes-generiques.ts`, sur la légende rendue et
non sur la lecture). Un studio faisait exception : 1spin4win, **9 %**, seul à
avoir été lu au moment de la capture avec le vocabulaire complet. C'est la
cible des cinq autres.

La relecture lancée, les premières fiches relues ont été rouvertes pour ne
regarder que ce qui **reste** muet avec le vocabulaire du jour — les seules
pages qu'il restait à apprendre. Wazdan sort à **220 pages lues pour 27
muettes**, et les 27 se ressemblent toutes : le plafond de gain annoncé (« The
maximum win amount is 5000x bet »), la table qui suit la mise, l'indépendance
des parties, le symbole collant qui ne change rien au tirage des autres, la
matrice des cloches, un déclenchement coupé par un retour à la ligne. Pragmatic
tenait à 15 muettes sur 35 : sa page « How to play » entière — vitesses de
tour, jetons ou argent, bouton de lancement —, le Wild empilé, le Scatter qui
n'apparaît que sur certains rouleaux, les tours gratuits au déclenchement
aléatoire ou tirés au sort entre plusieurs formules. Hacksaw, Play'n GO et
BGaming n'avaient plus qu'une page chacun, propre à un jeu.

**Le plafond de gain annoncé déclenche désormais la phrase des chiffres**, au
même titre que le RTP annoncé : la valeur écrite est celle de la fiche,
vérifiée à la campagne, jamais celle lue dans l'image.

Une coquille de plus au vocabulaire : « ©xcept » — Tesseract prend le *e*
ornementé de la police Pragmatic pour un ©, et la règle du Wild y échappait.

## 2026-09-13 — Le RTP s'écrivait « 96.18 % » en français, dans le titre

where2spin a été soumis à Search Console le 12/09 au soir et le crawl a
commencé : ce que le robot lit maintenant, il l'enregistre. Un contrôle de ce
que le site **sert réellement** a donc été fait, plutôt qu'une relecture du
code.

Trois points sur quatre étaient bons : `robots.txt` correct, sitemap à 4 290
URL ne contenant que des fiches publiées, fiche non publiée en `noindex` et
hors sitemap, canonical et hreflang FR/EN/DE avec `x-default`.

**Le quatrième ne l'était pas.** Le titre des 4 290 URL écrivait le taux de
retour « 96.18 % » — point décimal — dans les trois langues, alors que le
français et l'allemand veulent la virgule. C'est le titre que Google affiche
dans ses résultats : la copie visible était la fausse. Et sur la fiche
elle-même, la légende écrivait « RTP 96,50 % » quand le bloc de chiffres juste
à côté affichait « 96.50% ».

La cause est une constante recopiée : la locale de formatage vivait dans
**trois** modules et manquait au quatrième. Elle est désormais à un seul
endroit, avec la fonction qui écrit un taux, et le titre, le bloc de chiffres,
le RTP de l'achat, les guides et la recherche s'en servent tous.

**Reste `CarteJeu`**, la vignette du catalogue, qui ne reçoit pas la langue :
la lui passer demande de la faire descendre depuis quatre pages. Fait à part,
pour ne pas mélanger une correction urgente et un remaniement.

## 2026-09-13 — Une clause d'habillage légendait six tables de gains

**Les six pages du panneau d'All Ways Egypt sortaient toutes « Les mentions de
fin du panneau de règles ».** Ce sont des tables de gains et des pages de
symboles. Une phrase fausse est pire qu'une phrase générique, et celle-ci
touchait les 647 pages du studio.

La cause vient de la réparation du matin. 1spin4win n'imprime pas son RTP : son
panneau se reconnaît à la clause « MALFUNCTION VOIDS ALL PAYS AND PLAYS »,
sans quoi ses captures étaient jetées. Mais cette clause est peinte sur
**chaque** page de leur panneau, et tant que rien d'autre n'y était reconnu,
elle emportait la décision partout. `dysfonctionnement` passe donc au poids 1,
comme `achat-propose` : il lui faut désormais un second énoncé — le sort des
parties interrompues, la version de l'aide — qui, lui, ne figure que sur la
vraie page de mentions.

**Et le studio a reçu son vocabulaire** : la table de gains à sa structure
(« 5. 100 », « 4. 25 », « 3. 10 » en colonnes), le Wild qui multiplie le gain
qu'il complète, les tours bonus gagnés avec 3, 4 ou 5 Scatters, les gains qui
ne paient que de gauche à droite, le plafond de mise de l'achat. Sur
échantillon : **7 pages identifiées sur 9**, contre 0 correctement avant.

**`--refaire`, une troisième porte.** `--muettes` ne reprend que les pages
restées vides : il suppose qu'un verdict déjà posé est bon. Cette hypothèse
tombe dès qu'un énoncé décidait à tort — les 647 pages fausses n'auraient été
rouvertes par aucune des deux portes existantes.

## 2026-09-13 — Une campagne ne meurt plus parce que le pooler a coupé

La campagne 1spin4win s'est arrêtée à son **106ᵉ jeu sur 223**, sur un
`Server has closed the connection`. Ce n'est pas une panne : Supavisor ferme
les connexions dormantes, et une campagne passe **une minute par jeu sans rien
demander à la base** — elle photographie. La connexion tombe donc forcément au
bout de quelques dizaines de jeux, et l'échec arrive au moment précis où l'on a
du travail à sauver.

Rien n'était perdu — `capturesLe` fait marque-page, les jeux non traités
restent en file — mais le programme s'arrêtait et personne ne le voyait avant
de relire le journal : deux heures de machine libre pour rien.

L'écriture rejoue donc trois fois, à 1, 4 et 12 secondes, **et seulement pour
les erreurs de transport** : une contrainte violée ou une donnée refusée doit
continuer d'échouer bruyamment, au premier essai. Il n'y a rien à rouvrir à la
main — le client Prisma rétablit sa connexion tout seul à la requête suivante ;
ce qu'il ne fait pas, c'est **rejouer** celle qui est tombée.

### Mesuré au passage : le blocage géographique et celui de la base

Un VPN américain a été essayé pour débloquer Endorphina (224 fiches) et Push
Gaming (84). Le mur géographique tombe : `player.eu.demo.pushgaming.com` rend
**403 depuis la France** (« CloudFront is configured to block access from your
country », refusé au bord en 45 ms) et **404 depuis Atlanta** — on entre, c'est
l'adresse qui n'existe pas. Endorphina répond 200 là où la France lisait
« Forbidden For Your Region ».

Mais **Supabase refuse la connexion à travers le VPN** : le TCP s'ouvre, puis
Postgres ferme, systématiquement — le comportement d'une protection qui écarte
les IP de datacenter, et Proton sort chez Datacamp. Capturer et publier dans le
même passage devient donc impossible tant qu'on ne peut pas ne router **que**
le navigateur. Sans split tunneling, il faudrait un mode hors-ligne : capturer
sur le disque sous VPN, téléverser et écrire une fois coupé. Une heure de
travail pour 308 fiches, remise à plus tard — 1 402 fiches sont capturables
sans aucun VPN.

## 2026-09-13 — Le cadre de démo dit d'où vient la démo

Certains studios refusent de servir leur démo hors des pays qu'ils couvrent :
Endorphina répond « Forbidden For Your Region », Push Gaming un 403 CloudFront.
Le visiteur cliquait, le cadre restait **noir, sans un mot**, et il attribuait
la panne au site qu'il avait sous les yeux.

Ça ne peut pas se prévoir depuis le serveur : c'est le **navigateur du
visiteur** qui va chercher le jeu, depuis son IP et son pays. Aucun proxy de
notre côté n'y change rien — un proxy sert à nos captures, pas à la démo du
visiteur. Le dire est donc la seule réponse honnête, et le lien vers le site du
studio lui donne une porte de sortie plutôt qu'un écran mort. Le texte ne
reproche rien à personne : il dit qui sert la démo, et que le pays peut la
refuser.

## 2026-09-13 — Les quatre autres studios, et le titre qui écrasait le contenu

Après Wazdan, les pages muettes ont été ouvertes studio par studio et leurs
formulations relevées au mot près. Mesuré sur échantillon régulier :

| studio | pages du site | avant | après |
|---|---|---|---|
| Hacksaw | 963 | 6 lues · 3 muettes | **25 lues · 1 muette** |
| Play'n GO | 438 | 3 · 2 | **6 lues · 1 muette** |
| Pragmatic | 4 276 (47 %) | 2 lues sur 5 | 3 lues sur 5 |
| BGaming | 1 173 | 12 · 18 | vocabulaire ajouté, à remesurer |

**La clause de dysfonctionnement est le témoin le plus répandu du site, et
l'OCR l'écrit « volds ».** Tesseract confond le i et le l dans la police de
Play'n GO — « voids » ne correspondait pas, et la page de mentions légales de
chacun de ses 113 jeux passait à la trappe, avec « pald out » et « wviinnings »
dans la même page. Ces coquilles sont désormais dans les motifs, parce qu'elles
sont systématiques et non accidentelles.

**Le titre du studio écrasait le contenu de la page.** Quand le panneau nomme
sa page lui-même — « Special wilds », « Expanding wilds » —, ce nom décide du
sujet, et c'est voulu : il évite qu'une page de Wilds soit légendée comme un
achat à cause du bouton « BUY FREE SPINS » peint en permanence dans l'habillage
Pragmatic. Mais le modèle du type ignore le titre autant que le contenu : les
deux pages recevaient **la même phrase**, « La mécanique expliquée par le jeu
lui-même ». 488 captures de mécanique et 213 d'achat étaient dans ce cas. Le
titre ouvre toujours, et ce que la page dit vient maintenant le compléter, deux
énoncés au plus.

**Autres pièges payés** : `achat-propose` est volontairement faible (poids 1)
parce que « BONUS BUY » est un bouton d'habillage — il fallait donc un second
énoncé pour la vraie page d'achat de Hacksaw, pas un élargissement du premier.
Et la table de gains de BGaming, « 13+ 100.00 FUN » en colonnes, se reconnaît à
sa **structure** : six lignes de ce gabarit, sans qu'aucun de ces nombres soit
recopié dans la légende.

## 2026-09-13 — Le panneau de Wazdan se lit enfin (un quart du site)

Wazdan pèse **2 207 des 8 951 pages de panneau** du site, et 60 à 70 % d'entre
elles restaient muettes après le chantier des légendes. L'OCR n'y était pour
rien — relu, il rend « Drawing at least 6 Hold the Jackpot Bonus symbols
activates the Hold the Jackpot Bonus Game » sans une faute. C'était un trou de
vocabulaire : l'énoncé `hold-and-win` ne connaissait que « hold & win » et
« respin feature », deux formulations que ce studio n'emploie jamais.

**Onze énoncés relevés au mot près** sur 12 Bells, Mighty Wild: Panther et
Magic Fruits 81 : le déclenchement du jeu bonus, l'absence de symbole ordinaire
en jeu de base, les symboles qui se collent aux rouleaux, la relance du
compteur de re-spins, la fin de partie, les jackpots MINI/MINOR/MAJOR, le GRAND
Jackpot, le Collecteur, le Mystère — plus deux pour les classiques à fruits, la
table de gains lue à la mise minimale et le Wild qui étend les lignes.

**Aucun ne cite un chiffre, et c'est verrouillé par un test.** Le déclenchement
vaut « 4 symboles sur la rangée du milieu » sur 12 Bells et « au moins 6 » sur
Mighty Wild: Panther, pour un texte par ailleurs identique au mot près ; le
Collecteur multiplie par 1-20x ici et 1-10x là. Recopier ces nombres
publierait une règle fausse sur la fiche voisine — le test refuse toute
légende Wazdan qui contient un chiffre.

Mesuré sur trois fiches représentatives avant la passe complète : **22 pages
identifiées, 1 muette** — la seule restante étant la table de gains elle-même,
qui n'est faite que d'images et de nombres. Auparavant, ces mêmes 23 pages
donnaient 7 fois la même phrase.

## 2026-09-13 — 1spin4win branché, et le témoin qui jetait ses captures

**226 fiches attendaient une seule chose : des coordonnées.** Le lanceur de
1spin4win est direct — pas de jeton, pas de Cloudflare, pas de fenêtre à
ouvrir sur le poste : un `<canvas>` 1280×719, un bouton de démarrage à
(640, 709), l'icône « i » de la barre du bas à (148, 727). Deux ancres fixes,
parce qu'elles appartiennent au lanceur ; tout le reste — la flèche « page
suivante », la pastille d'achat de bonus — **bouge avec l'habillage** et est
mesuré à l'image, comme la plus grosse tache claire *compacte* d'une fenêtre
étroite. Trois pièges payés à la reconnaissance sont documentés dans le
fichier : le bouton de démarrage change de couleur d'un jeu à l'autre (vert
ici, bleu là-bas), le néon qui cerne le panneau pèse plus lourd que la flèche,
et deux pages voisines peuvent être visuellement identiques — s'arrêter au
premier écran immobile rendait quatre pages sur six, en silence.

**Le témoin d'entrée dans le panneau rejetait des captures parfaitement
bonnes.** `EN_TETE_PANNEAU` exigeait « RTP », « GAME RULES » ou « PAYTABLE »
dans l'OCR d'au moins une page. Or 1spin4win **n'imprime son taux que sur une
minorité de ses jeux** : sur dix panneaux ouverts et photographiés, deux
seulement portent la ligne « RTP - 97.40% ». Les huit autres repartaient en
file avec leurs quatre à sept captures jetées, pour être rechargés à la
campagne suivante et subir le même sort. La mention de nullité —
« MALFUNCTION VOIDS ALL PAYS AND PLAYS. » — est peinte sur **chaque** page de
leur panneau et se lit sans faute : le témoin l'accepte désormais, et le studio
passe de 1 jeu sur 10 à 10 sur 10. Élargir une alternance ne peut que faire
correspondre davantage, et la recherche d'icône de Pragmatic ne lit que la
bande haute, où cette phrase ne figure jamais.

**Le taux, quand il est affiché, est maintenant lu** — « RTP - 97.40% », sans
verbe, échappait à toutes les règles existantes. Ce n'est pas ce qui débloque
le studio : ses fiches ont déjà leur taux en source studio. C'est un contrôle,
et il est bon — là où le panneau a pu être lu, il confirmait la base au
centième (Brumbys 243 : 97,60 ; Fruit Cafe 20 : 97,00 ; Lucky Clover 27 :
96,90).

## 2026-09-13 — Les légendes disent enfin ce que la capture montre

**53,9 % des légendes du site étaient des doublons à l'intérieur de leur propre
fiche**, et 99,3 % des fiches à captures en portaient au moins un : 16 827
phrases en trop sur 31 200, dont 5 468 sur les seules pages de panneau. Sept
pages de règles différentes — la table de gains, la règle de formation des
gains, le RTP, le menu de jeu automatique, les réglages, les mentions de fin —
recevaient toutes « Une page du panneau de règles, telle que le jeu l'affiche ».
La légende était dérivée du **type** de la capture, et le type ne sait rien dire
de plus.

**Ce qui change : la reconnaissance se fait à l'écriture, pas au rendu.** Le
pipeline lit déjà chaque page de panneau par OCR pour y chercher le RTP. Ce
texte servait une fois puis disparaissait ; il est maintenant confronté à 43
formulations relevées au mot près chez Pragmatic, Wazdan, Hacksaw et BGaming,
rattachées à 15 sujets. Ce qui part en base, c'est le **verdict** — le sujet de
la page, les codes des formulations reconnues, au plus deux chiffres de
déclenchement —, une centaine d'octets rangés dans le champ `lecture` de la
capture.

**Le texte OCR, lui, ne part pas.** Le publier coûterait une dizaine de
kilooctets par fiche expédiés au navigateur, pour une prose que personne n'a
relue et qui n'est affichée dans aucune des trois langues. BetsRank a déjà payé
cette facture à 11,4 Mo de bundle. Chaque sujet porte une phrase **écrite et
relue une fois** en français, en anglais et en allemand ; les chiffres viennent
de la fiche, jamais de l'image.

**On ne traduit jamais l'OCR, et on ne devine pas.** Sous le seuil de preuve,
`lireCapture` rend `null` et la légende générique reste — elle est vraie, elle
est juste pauvre. Un nombre lu à neuf ne l'est que s'il est **unanime** dans la
page : « Land 3 FS scatter symbols » et « Land 4 FS scatter symbols »
cohabitent chez Hacksaw, et retenir le premier publierait un déclenchement
faux. Les valeurs de symboles ne sont jamais transcrites : recopier vingt-sept
petits nombres lus dans une image est la façon la plus sûre d'introduire une
erreur, et elle serait signée par le site en trois langues.

**Une table de gains sur trois pages n'est pas trois fois la même page.** Les
légendes sont donc calculées pour la fiche entière et non capture par capture :
la répétition est signalée — « Suite de la page précédente » — plutôt que
réécrite. Le dire est exact, et ça rend la série lisible.

**Le bloc des captures ne part plus dans le navigateur.** `CapturesJeu` était
`'use client'` pour une seule raison — `useLangue()` lit la langue dans le
chemin — et entraînait `src/lib/legendes.ts` avec lui : le vocabulaire des
panneaux et les phrases en trois langues pèsent **11 ko gzip**, servis sur
chacune des 1 090 fiches publiées. La page connaît déjà la langue, elle est
dans son URL ; elle la passe en propriété, le composant redevient serveur, et
le module disparaît du lot client — **4,5 ko de moins qu'avant ce chantier**,
alors que le module a quadruplé. Seule la galerie reste cliente : c'est
l'agrandissement au clic qui a besoin du navigateur, pas la légende.

**Le rattrapage.** `scripts/relire-legendes-captures.ts` relit les 6 652 pages
de panneau déjà en ligne, là où elles sont publiées : les images existent, le
panneau y est lisible, il suffisait de les rouvrir. `capturesLe` étant posé,
aucune campagne ne les aurait reprises. La passe n'écrit que le champ `lecture`
— ni RTP, ni volatilité, ni légende existante — et ne consomme aucun build :
les fiches changent à la revalidation ISR suivante. Une page lue sans rien
donner reçoit `null`, qui veut dire « lue, rien de sûr » et non « pas encore
lue » : c'est la différence qui rend la passe interruptible et relançable sans
refaire trois heures d'OCR.

## 2026-09-13 — Une recherche instantanée, groupée par catégorie

Le champ de l'accroche postait vers `/catalogue` et n'affichait rien avant le
rechargement. Il rend maintenant une liste déroulante à la frappe, groupée en
**machines à sous / fournisseurs / guides / casinos partenaires**, l'ordre des
groupes suivant la pertinence : « hacksaw » sort le studio en premier,
« gates » ses jeux.

**L'index n'est pas embarqué, et ne peut pas l'être.** BetsRank tient sa
recherche en mémoire dans le navigateur — 1 894 fiches, au prix d'un index
allégé, la version complète pesant 11,4 Mo de bundle. Le catalogue d'ici en
compte **11 658** : même réduit au nom et au studio, l'index dépasserait le
mégaoctet, servi sur chaque page. D'où une route, `/api/recherche`, qui
interroge Postgres, et un anti-rebond de 180 ms côté champ. Coût réel mesuré au
build : **+2,4 ko sur la page d'accueil** (12,8 → 15,2 ko), +3 ko de premier
chargement, et **rien sur le lot partagé**, qui reste à 103 ko.

**Seules les fiches publiées sont proposées** : `filtrePubliable()`, le même
filtre que le catalogue. Proposer une fiche sans RTP ni capture enverrait le
visiteur précisément là où le site n'a pas tenu sa promesse, et il n'a aucun
moyen de le deviner avant d'avoir cliqué. Idem pour les studios : celui dont
aucune fiche n'est finie ne sort pas.

**Deux pièges payés.**

La liste ne s'affichait pas. Elle existait dans le DOM, répondait au clavier,
et restait invisible : l'accroche est en `overflow-hidden` — elle doit l'être,
ses halos débordent volontairement et sans confinement la page défile
latéralement au téléphone — et elle coupait la liste net sous la pilule. Elle
est donc projetée dans `body`, sa position mesurée sur la pilule et refaite au
défilement.

Une fois projetée, elle n'était plus un descendant du champ : le « clic
dehors » la refermait avant que le clic n'atteigne le lien. Elle porte un
repère `data-recherche` que ce test reconnaît. Le symptôme est traître — une
ligne impossible à ouvrir à la souris, et parfaitement fonctionnelle au
clavier.

**Au passage :** le formulaire pointait sur `/catalogue`, sans langue. Un
visiteur en français validait sa recherche et atterrissait sur `/en/catalogue`
— le point d'entrée du site le ramenait à l'anglais.

Les casinos sont filtrés par pays dans la route, ce que la route peut se
permettre parce qu'elle est dynamique : ailleurs le filtrage a lieu dans le
navigateur, les pages étant rendues avec `revalidate`. Leurs liens sortent par
`/go/`, en `rel="sponsored nofollow"`, et sont étiquetés « lien partenaire ».

## 2026-09-13 — 264 fiches publiées n'avaient pas de vignette

Les 1 855 jaquettes de `public/images/slots` viennent du lot importé de
BetsRank. Tout studio ouvert depuis — Wazdan, Play'n GO, Red Tiger — n'en a
aucune : **264 fiches publiées** affichaient le repli textuel, un nom sur fond
dégradé, alors que le site venait précisément de photographier leur jeu.

Chacune a pourtant sa capture **« The base game »** : l'écran à l'ouverture de
la démo, avant le moindre tour. C'est la seule qui montre le jeu et non son
règlement — une page de règles ferait une vignette illisible en 160 px.

**Écrit en base plutôt que calculé au rendu**, parce que `visuelUrl` est lu par
les cartes du catalogue, la vitrine d'accueil, le sitemap et la carte de
partage : un repli à l'affichage aurait dû être répété dans chacun, et le
premier oubli serait passé inaperçu. L'origine reste lisible dans le chemin —
`/images/slots/…` pour une jaquette de studio, `…/captures/…` pour une capture
adoptée — de quoi les reprendre le jour où les vraies arrivent.

264 posées, **plus aucune fiche publiée sans vignette**.

## 2026-09-13 — La balise de mesure Google, sur les deux racines

Le site a **deux racines** : `[langue]/layout.tsx` pour les pages publiques et
`go/layout.tsx` pour l'écran de sortie, qui vit hors de `[langue]` et n'hérite
donc de rien — c'est déjà ce qui l'avait laissé sans feuille de style pendant
des semaines. Poser la balise à la main aux deux endroits invitait au doublon,
et Google en demande **une seule** par page : deux compteraient deux fois la
même visite. D'où un composant partagé, `src/components/Mesure.tsx`.

`afterInteractive` : la mesure n'a pas à retarder l'affichage.

**Ce que la mesure va confirmer.** Les clics enregistrés montrent déjà un motif
net : 18 des 23 clics de ces deux jours portent **le même user-agent**, un
iPhone sous iOS 13.2.3 — une version de 2019 — **sans aucun referer**, depuis
l'Indonésie, le Brésil, Hong Kong, la Thaïlande, la Corée. Ils attaquent
directement `/go/<casino>` sans jamais passer par une page du site. C'est un bot
qui récolte des liens d'affiliation, pas du trafic.

Le coût n'est pas la statistique faussée mais le **ratio clics/FTD** que lit un
affiliate manager avant de renégocier un CPA. Un filtre reste à écrire : un clic
sans referer *et* au user-agent obsolète n'est pas un visiteur.

⚠️ **Aucun consentement n'est demandé.** GA4 dépose des identifiants et le site
s'adresse à l'Europe : c'est une dette à régler avant de pousser sur
l'acquisition.

## 2026-09-13 — Sept studios de plus : 1 556 démos

| studio | trouvées | comment il publie |
|---|---|---|
| Spinomenal | **633 / 648** | deux sauts : fiche → bouton « PLAY NOW » → enveloppe |
| Amusnet | **252 / 280** | son Drupal est ouvert : 10 requêtes pour 491 nœuds |
| 1spin4win | **226 / 229** | JSON-LD `VideoGame`, `potentialAction.target` |
| TaDa | **233 / 249** | catalogue en 4 requêtes, démo en `/PlusTrial/<gid>/` |
| Spinoro | **212 / 231** | lanceur en clair dans l'iframe de la page de jeu |
| Yggdrasil | en cours | WordPress, `wp-json/wp/v2/games`, démo sans jeton |
| **Synot** | **0 / 243** | **ne publie aucune démo publique** |

**Le constat Synot vaut autant que les autres.** Ont été essayés : la fiche
produit (seul bouton « MORE INFO »), `wp-json/wp/v2/games` (246 jeux, `acf`
vide), la route maison, les 210 ko de JS du thème — où le mot « demo »
n'apparaît **pas une fois** —, `dev.synotgames.com` et les sous-domaines :
`demo.` existe mais répond 404 partout, les autres n'ont pas de DNS. Les seules
démos Synot en ligne sont chez des comparateurs, donc chez des concurrents : le
script refuse de les écrire. C'est consigné dans son en-tête pour que personne
ne refasse le tour.

**Un lanceur à jeton refusé, sciemment.** Chez Amusnet, le bouton « Play Demo »
appelle une API, reçoit un jeton et ouvre `free.games.amusnet.io`. Sans
`Referer` du domaine, ce lanceur répond **302 vers la page d'accueil
marketing** — le piège Wazdan à l'identique. C'est donc la fiche produit qui
est écrite, comme les six lignes déjà en base.

**Ce que les garde-fous ont attrapé.** `amusnet.com/…/20-golden-dice` répond
**200** avec une page « Game Not Found » : cinq fiches sauvées d'une URL morte
sous un bouton « jouer ». Le lanceur Amusnet accepte `gameId=999999` et renvoie
un lanceur d'apparence normale — aucune de ses réponses n'est une preuve.
Yggdrasil, lui, rend un 403 sur un identifiant inventé : l'existence y est
réellement vérifiable. Et le `×` U+00D7 de la gamme « Hold&Hit 3×3 » faisait
sortir **30 jeux Spinomenal** en faux écart de nom.

**Une leçon sur la vérification du nom.** La première version vérifiait TaDa
sur le `<title>` du build, comme chez Hacksaw : **56 % au lieu de 94 %**. TaDa
livre ses jeux sous leur nom interne — « Witch » pour « Witches Night » — quand
il ne les livre pas sans titre. La confrontation est remontée sur la **carte du
catalogue**, le nom que le studio destine aux joueurs.

**Deux pannes réseau diagnostiquées, utiles bien au-delà de ce script.**

· Le `fetch` de Node **n'a pas de délai par défaut** : Yggdrasil accepte la
  connexion et ne répond jamais, le script se fige sans une ligne de journal.

· **La reprise de session TLS** était le vrai coupable d'un blocage systématique
  vers la 121ᵉ fiche, pendant qu'un `curl` obtenait la même page en 2,3 s sur la
  même IP. Ni bannissement, ni DNS, ni pool undici. Avec
  `maxCachedSessions: 0` : 200 requêtes d'affilée, zéro échec.

## 2026-09-12 — Cinq noms tronqués, cinq démos retrouvées

Nolimit City nomme ses mécaniques dans ses titres : « San Quentin » chez nous,
**« San Quentin xWays® »** chez eux. Le nom tronqué empêchait le script de
rapprocher la fiche de sa page, et il refusait d'écrire.

**Ce refus était la bonne règle**, et c'est le point : c'est exactement lui qui
a arrêté `game-1`, dont le slug générique mène en réalité à « Fire In The
Hole 4 » — le piège Victorious MAX. Assouplir la comparaison des noms aurait
débloqué cinq fiches **et** lié une démo au mauvais jeu. Corriger les noms à la
source débloque les cinq sans rien concéder.

Corrigés : Apocalypse Super xNudge®, East Coast VS West Coast, San Quentin
xWays®, Warrior Graveyard xNudge®, xWays Hoarder xSplit®. Nolimit City passe de
137 à **142 démos**. `game-1` reste seul, non corrigé et non lié.

## 2026-09-12 — Une campagne à la fois, et pourquoi

Trois campagnes lancées en parallèle ont fait monter le poste à `load average
23` avec quinze Chromium. Les jeux ne finissaient plus de charger dans le délai
prévu, l'adaptateur cliquait avant que l'écran soit prêt, et le journal rendait
**« icône des règles introuvable »** — le diagnostic d'un adaptateur mal réglé.

BGaming a publié **2 jeux sur 107** dans ces conditions. Relancé seul, il rend
11 et 10 captures avec les RTP lus (97,10 et 95,97). Une heure a été passée à
soupçonner un ban du studio, puis un adaptateur cassé ; la cause était la
machine, et rien ne le signalait.

Le même parallélisme avait déjà fait rendre un 502 à Supabase, tuant une
campagne de 261 jeux à sa quatorzième fiche.

**La règle** : enchaîner, ne pas superposer. Et avant de conclure qu'un
adaptateur est cassé, regarder `uptime` puis retester deux jeux seuls — trente
secondes, et ça tranche.

## 2026-09-12 — Evoplay, et deux façons de peindre le même écran

71 fiches débloquées, et une observation qui aurait fait échouer la campagne
sans qu'on comprenne pourquoi.

**Evoplay peint le même habillage de deux façons.** Sur Anubis' Moon, toute
l'interface est du HTML — `.ui-rules`, `scrollTop` lisible et inscriptible. Sur
**dix des onze jeux sondés**, le document ne contient **pas un seul
`<button>`** : le même écran est peint dans le canvas. S'appuyer sur les
sélecteurs aurait marché à la reconnaissance et échoué en campagne. L'adaptateur
ne clique donc qu'à des coordonnées.

**Le témoin d'ouverture était le piège.** Il cherchait `/RTP/i` dans le texte
lu. Sur B-Ball Blitz, l'OCR rend « Rul . B-Ball oan 0%) » — panneau **grand
ouvert**, sept tentatives, jeu renvoyé en file avec le diagnostic d'un
adaptateur mal réglé. Le témoin est devenu `GAME DESCRIPTION`, lu sans une
faute sur les cinq jeux relevés.

**Les onglets sont ancrés en bas**, pas en haut : une entrée « Bonus Buy »
décale tout le groupe d'un cran, et une même ordonnée désigne « Paytable » dans
une disposition et « Rules » dans l'autre. L'adaptateur essaie les deux, en
commençant par celle qui est inerte sur l'autre disposition. Et l'entrée
« Bonus Buy » n'existe que si le jeu vend la fonction : c'est le jeu qui répond,
au lieu de viser un bouton qui se déplace.

**`lecture-regles.ts` apprend le bandeau Evoplay.** Leur corps de texte écrit
« The overall theoretical return to player is 96.00 % » — sans le sigle après
« Return to Player », hors de portée de la règle générale. Mais leur bandeau le
porte sur **chaque** page : « Rules / Fruit Nova (RTP 96.00%) ». C'est la forme
la plus sûre, elle ne dépend pas de la page atteinte.

**Le périmètre réel est de 71 jeux, pas 90** : sont écartés 7 jeux de table
(leur bandeau n'affiche aucun taux et la colonne gagne deux entrées), 9 dont
l'URL rend un 404 nginx — le défaut est dans la `demoUrl`, pas dans
l'adaptateur — et 3 qui pointent encore la page marketing.

## 2026-09-12 — Un 502 de Supabase tuait une campagne entière

La campagne Wazdan est morte **à la quatorzième fiche sur 261** : un `502 Bad
Gateway` du stockage, une seconde de panne, et les treize captures déjà faites
sont parties avec. Une capture coûte une minute de navigateur — c'est le prix
fort pour un hoquet réseau. Trois campagnes téléversaient en parallèle ; le
stockage a simplement lâché.

`televerser` réessaie maintenant, avec des reculs de 1, 4 puis 12 secondes.
**Mais seulement ce qui peut réussir au coup suivant** : 5xx, 408, 429, ou une
coupure réseau. Un 401 ou un 403 sont des refus d'identité — les rejouer ne les
rendrait pas vrais, ça ne ferait que retarder le diagnostic de trois reculs.

Cinq tests fixent le contrat. L'un d'eux a d'abord échoué pour une raison qui
mérite d'être notée : le corps d'une `Response` ne se lit **qu'une fois**, et
réutiliser le même objet dans une boucle de réessais faisait échouer le second
`.text()`. Le test mesurait alors sa propre erreur au lieu de celle du code.
Les réponses simulées sont donc des fabriques, pas des objets.

## 2026-09-12 — Wazdan : le lanceur ne sert pas le jeu à tout le monde

261 fiches débloquées, et deux pièges dont un aurait faussé presque tout le lot.

**Le lanceur trie sur l'`User-Agent`, en silence.** `gamelaunch.wazdan.com`
répond **301 vers la fiche marketing** dès que l'UA n'est pas celui d'un vrai
navigateur. Mesuré au même instant sur le même jeu : `Chrome/140` → le jeu,
`HeadlessChrome/140` → la fiche, `curl/8.7.1` → la fiche. Le tri est serveur,
avant tout JavaScript, et rien n'échoue : la page charge, `load` se produit.
La première reconnaissance a photographié le site de Wazdan pendant quarante
secondes en croyant filmer un jeu. L'adaptateur réécrit donc l'en-tête — et
Wazdan n'exige **pas** de navigateur avec tête, seulement un UA qui ne dise pas
« Headless ».

**La volatilité qui n'en était pas une.** Le règlement se termine par une
section générique « Volatility Levels™ » décrivant le *réglage* que le joueur
peut changer : les trois modes y figurent sur **tous** les jeux.
`extraireLesFaits` y lisait « high volatility » et rendait HAUTE — et le runner
l'aurait écrite, la volatilité n'étant conditionnée qu'à l'absence de désaccord
sur le RTP. **259 fiches sur 261** auraient été étiquetées « volatilité haute »
sur la foi d'un paragraphe qui parle d'un bouton. L'adaptateur s'arrête de
capturer avant cette section, dont il demande la position au DOM.

**Deux autres observations qui ont coûté à trouver.** Espace ferme l'écran
d'accueil — mais sur un jeu qui n'en a pas, Espace **lance un tour** : capture
du jeu de base avec trois STOP affichés et solde entamé. D'où l'ordre inversé :
on demande d'abord le panneau ; s'il s'ouvre, il n'y avait pas d'accueil. Et
Échap sur le panneau « i » ne ferme pas, il ouvre **« Exit the game? »**, une
boîte dans laquelle tout ce qui suit vient cliquer.

**`lecture-regles.ts` apprend la formulation Wazdan.** Le studio écrit « Game
average return to player: 96.15% » — jamais le sigle — et « The maximum win
amount **is** 750x bet », sans le « limited to » de la formule Pragmatic. Les
deux valeurs étaient à l'écran, lues sans faute par l'OCR, et jetées par
l'interprétation. Ajout additif, vérifié : les 19 tests existants passent
inchangés, trois nouveaux fixent les formulations.

Vérifié sur trois jeux : 18, 13 et 15 captures, RTP **96,15 · 96,13 · 96,14**,
volatilité `null`. `capturerLAchat` rend `false` sans rien tenter — le chariot
existe mais la boîte s'ouvre dans le canvas, sans témoin DOM : un faux positif
publierait le jeu de base sous la légende « Buying the feature » sur 261 fiches.

## 2026-09-12 — Hacksaw : 36 pages produit retirées, 36 jeux bien vivants

Une campagne de captures venait d'échouer sur **36 jeux sur 39**, tous en
`ERR_HTTP_RESPONSE_CODE_FAILURE`. Leur `demoUrl` répond par un **302 vers
`/Start`**, qui rend lui-même un 404.

**Le studio a retiré la page produit, pas le jeu.** Sur les 246 tuiles de son
catalogue, 145 ont un bouton « Read more » vers une page produit et **101 n'ont
plus qu'un bouton « Try it »**. Les 36 mortes sont toutes dans ce second lot.
La tuile porte le `data-gameid` que leur lanceur maison passe à
`static-live.hacksawgaming.com/<gameid>/<version>/index.html`.

**36 retrouvées sur 36. Aucun jeu réellement retiré.**

**Le garde-fou du 200 a servi une fois de plus** : `static-live/9999/…`
répond 200 et sert un vrai jeu — intitulé **« Slottemplate »**, le gabarit
interne du studio. Le `gameid` n'est donc jamais déduit d'un compteur, il est
lu dans la tuile. Et quatre jeux sortaient d'abord en « retiré » parce que
Hacksaw échappe ses apostrophes en hexadécimal (« Frank's Farm »).

**Une erreur de méthode rattrapée en cours de route**, qui vaut d'être notée :
un premier jet lisait le catalogue **après** avoir sondé les 145 fiches, se
faisait repousser, recevait une liste vide et **déclarait 58 jeux retirés**
alors qu'ils étaient tous en ligne. Le catalogue se lit maintenant en premier,
un code inattendu donne « sondage impossible » et non un verdict, et un
catalogue de moins de 100 tuiles arrête le script.

`demoExploitable` de l'adaptateur accepte désormais les deux formes — sans
quoi les 36 fiches réparées seraient devenues invisibles au runner.

⚠️ **Aucune campagne Hacksaw ne passerait aujourd'hui.** Les démos affichent
« Connection lost to wallet », y compris celles dont la page produit est
vivante et lancées depuis le site du studio, sans aucun appel à leur RGS.
Trois mesures concordantes dont une après pause. Soit leur wallet de démo est
en panne, soit notre IP a été repoussée — précédent BGaming du 11/09. À
trancher depuis une IP reposée avant de relancer.

⚠️ **Ces URL portent un numéro de version de build** et se périmeront au
prochain correctif du studio. Le script est à relancer périodiquement.

## 2026-09-12 — Push Gaming : le blocage n'était pas celui qu'on croyait

**Correction d'une entrée de ce carnet.** Il y est écrit que le lanceur Push
Gaming refuse un token rejoué. C'est faux, et voici ce qui le prouve : un token
**fraîchement émis**, décodé de l'enveloppe et appelé pour la première fois,
répond `403` en **45 ms** au POP CDG55 — la requête n'atteint jamais l'origine.
Et la **racine** `player.eu.demo.pushgaming.com/` rend le même 403.

La vraie cause est le **géo-blocage** : la distribution CloudFront refuse les
IP françaises, corps AWS à l'appui — « *configured to block access from your
country* ». Aucune porte de côté : les ~60 sous-domaines déclarés en
transparence des certificats ont été passés en revue, aucun autre hôte de démo
ne résout, et les 84 enveloppes pointent toutes sur cet hôte unique.

**L'adaptateur est branché quand même**, et ce n'est pas contradictoire. Le
403 vit **dans l'iframe** : `page.content()` du cadre principal ne le contient
pas. Sans adaptateur, le runner capturerait une page blanche en « jeu de base »,
rendrait « icône des règles introuvable » — le diagnostic d'un adaptateur mal
réglé — et rechargerait les 82 fiches à **chaque** campagne. Il nomme donc le
blocage au lieu de le déguiser en panne : « démo géo-bloquée : CloudFront 403 ».

Aucune coordonnée, aucun délai de jeu n'a été inventé : rien ne s'affiche, donc
rien n'a été observé. Les inventer aurait produit des captures de décor
publiées sous la légende « Game rules ».

**Ce que ça coûte de débloquer** : pas du code, une **sortie réseau hors de
France**. Le `country=GB` du lanceur suggère que le Royaume-Uni passe. Une fois
la sortie disponible, la reconnaissance et la séquence de clics tiennent en une
séance — l'en-tête du fichier liste dans l'ordre ce qu'il restera à trouver.

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
