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
