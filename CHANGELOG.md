# Carnet de bord — where2spin

Ce qui a été fait, pourquoi, et les pièges rencontrés. Une entrée par commit.

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
