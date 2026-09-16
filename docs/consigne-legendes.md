# Écrire les légendes à la main — consigne

Tu écris les légendes qui passent **sous les captures d'écran** d'une fiche de
jeu, en trois langues (`fr`, `en`, `de`). L'étalon est `sweet-bonanza` : va le
lire avant de commencer.

## L'outil

```
npx tsx --env-file=.env.local scripts/legendes-a-la-main.ts --fiche <slug>
```

Télécharge les captures en PNG lisibles dans `/tmp/atelier-legendes/<slug>/`,
imprime les faits vérifiés de la fiche et la légende actuelle de chaque vue.
**Tu ouvres chaque PNG avec l'outil Read.** Une légende écrite sans avoir
regardé l'image ne vaut rien — c'est tout l'objet du chantier.

```
npx tsx --env-file=.env.local scripts/legendes-a-la-main.ts --ecrire lot.json
```

Le JSON est indexé par **nom de fichier** (les titres se répètent, les fichiers
non) :

```json
{ "slug": "sweet-bonanza",
  "legendes": { "sweet-bonanza-base.webp": { "fr": "…", "en": "…", "de": "…" } } }
```

L'outil sauvegarde tout seul avant d'écrire. Tu n'écris **jamais** dans
`/tmp` toi-même, tu ne commites pas, tu ne pousses pas.

**Nomme ton fichier de lot avec ton studio et le slug** — `nolimit-owls.json`,
`amusnet-100-cats.json` — jamais `lot.json`. Plusieurs agents travaillent en
parallèle sur ce chantier : un `lot.json` partagé s'est déjà fait écraser par
un autre studio entre l'écriture et la relecture. Un nom unique coûte trois
caractères et supprime le risque.

## La règle qui sépare une bonne légende d'une tiède

**Toute légende doit contenir au moins une chose qu'on ne peut savoir qu'en
regardant l'image.** Une position, une valeur affichée, une couleur, ce qui est
allumé, ce qui est grisé. Sans ça, tu as écrit un résumé du règlement — vrai,
mais que n'importe qui pouvait écrire sans ouvrir la capture.

Mesuré le 16/09/2026 sur les 3 346 légendes déjà écrites : **47 % n'en
contiennent aucune**. C'est le principal défaut du chantier.

L'étalon, Gates of Olympus, capture du jeu de base :

> *« Six reels, five rows, and no paylines: symbols pay anywhere on the screen,
> and the count of matching symbols sets the win. **The free spins purchase sits
> top left, priced at 100× the current bet.** »*

La seconde phrase est celle qui vaut : elle situe le bouton et lit son prix.

Deux exemples réels du chantier, même studio, même type de page :

**Au niveau** — Christmas Gift Rush, jeu de base :
> *« Trois rouleaux sur trois rangées, mais **une seule ligne active au départ —
> la guirlande lumineuse encadre la rangée centrale, seule allumée**. En haut à
> gauche, le bouton Buy Feature est affiché à ‡30,00 pour la mise de ‡1,00 en
> cours ; à droite, le compteur Jackpot Race™ marque 1 305,19 €. »*

**En dessous** — 20 Super Hot, page 1 :
> *« L'introduction du panneau : « 20 Super Hot video slot is a 5-reel, 20-line
> fixed game. » Huit symboles, deux d'entre eux spéciaux… »*

La seconde recopie le texte. Elle est juste, et elle n'apporte rien : le lecteur
a la capture sous les yeux, il voit déjà cette phrase. Ce qu'il ne voit pas tout
seul, c'est **où** se trouve ce qui compte et **quels chiffres** sont affichés à
cet instant.

Donc, à chaque capture, demande-toi : *qu'est-ce que je vois que le texte ne dit
pas ?* Et si la réponse est « rien », dis-le dans ton rapport plutôt que de
meubler.

## Ce qu'une légende dit

Elle décrit **ce que la capture montre** : la grille et ses rouleaux, le bouton
d'achat et son prix affiché, les paliers nets d'une table de gains, un
multiplicateur à l'écran, l'écran de bonus et ce qui le déclenche. Une ou deux
phrases, du concret, jamais de remplissage.

Elle ne dit pas ce qu'on ne voit pas. Les chiffres **du jeu** — RTP, gain
maximum, volatilité — viennent de la fiche imprimée par l'outil, jamais de
l'image : ils y sont souvent flous, et une valeur lue de travers publiée en
« source studio » est le pire cas du site. Les chiffres **de l'image** se
recopient s'ils sont nets, et se taisent sinon.

Les trois langues disent la même chose. L'allemand et l'anglais ne sont pas des
traductions mot à mot du français, mais aucun des trois ne porte un fait que
les deux autres n'ont pas.

## Deux vérifications gratuites, trouvées en chemin

Elles ne coûtent rien et elles ont chacune attrapé une erreur le 16/09/2026.

**Sur un Megaways, le compteur affiché est le produit des hauteurs.** Big Bass
Bonanza Megaways affiche 2 400 en haut à droite, et ses rouleaux mesurent
2-3-3-4-4-3 avec une rangée horizontale de 4 : 2 × 4 × 4 × 5 × 5 × 3 = 2 400.
Si ton comptage ne tombe pas sur le nombre affiché, **c'est ton comptage qui est
faux** — recadre avec `sharp` et recompte. C'est comme ça qu'une grille mal lue
a été rattrapée avant d'être écrite.

Le même contrôle a montré que la fiche de ce jeu annonçait 117 649 façons, soit
7⁶, alors que son panneau publie 46 656, soit 6⁶ : la valeur d'un autre Megaways,
recopiée.

**Chez Hacksaw, le seuil d'un bonus se compte dans l'illustration.** Le studio
dessine le symbole scatter exactement autant de fois qu'il en faut pour
déclencher — trois exemplaires empilés pour trois scatters. C'est un contrôle
arithmétique sur un champ que personne ne vérifiait, et c'est ce qui a montré
que `pray-for-three` annonçait « 5+ scatters » un bonus qui s'obtient à trois.

De façon générale : **quand un jeu affiche un nombre et le dessine aussi, les
deux doivent concorder.** Le désaccord est toujours une information.

## Les règles qui ne bougent pas

- **On n'invente rien.** Un doute = on n'écrit pas ce point.
- On ne juge pas le jeu, on ne le compare pas, on ne parle d'aucun opérateur ni
  d'aucun litige.
- Les noms de mécaniques déposés par le studio restent en anglais dans les trois
  langues (`Hold the Jackpot`, `xWays`, `Tumble`).

## Quand la fiche contredit le panneau

Ça arrive, et c'est précieux : six grilles fausses ont déjà été trouvées comme
ça. Mais **un rapport d'agent est une piste, pas une preuve.** Tu ne corriges
jamais la fiche toi-même. Tu le signales dans ton rapport final avec :

1. **la phrase du panneau recopiée mot pour mot**, en anglais, telle qu'elle est
   à l'écran ;
2. **le nom du fichier PNG** où elle se lit ;
3. ce que la fiche dit, et ce que le panneau dit.

Sans ces trois éléments la piste est jetée. Un chiffre vu dans un journal OCR
n'est pas une preuve : il faut l'avoir lu sur l'image.

## Ton rapport final

- combien de fiches, combien de captures écrites ;
- les fiches sautées et pourquoi (capture illisible, écran de chargement,
  panneau absent) ;
- les contradictions, au format ci-dessus.
