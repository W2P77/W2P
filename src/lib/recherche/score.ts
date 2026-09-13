/**
 * Le classement des résultats de recherche.
 *
 * ── Pourquoi un score en JavaScript et pas un ORDER BY ────────────────────
 *
 * Postgres sait dire *si* un nom contient « book ». Il ne sait pas dire, sans
 * extension de recherche plein texte, que « Book of Dead » vaut mieux que
 * « Bookie of Odds » pour cette requête-là. La base sert donc à **réduire** le
 * catalogue à quelques dizaines de candidats ; le classement se fait ensuite
 * ici, sur une poignée de lignes, où il coûte une milliseconde.
 *
 * ── Pourquoi une échelle et pas un booléen ────────────────────────────────
 *
 * Le premier résultat est le seul que la plupart des visiteurs regardent.
 * Trier par nom alphabétique ferait remonter « Aztec Bonanza » sur « Bonanza »
 * pour la requête « bonanza » — le titre exact arriverait quatrième. L'échelle
 * ci-dessous n'a donc qu'un but : faire gagner l'égalité parfaite, puis le
 * début de mot, puis le reste.
 */

/**
 * Rabat un texte sur ce qui se compare.
 *
 * Les accents partent : quelqu'un qui tape « demon » doit trouver « Démon ».
 * La ponctuation devient une espace plutôt que rien — sans ça « Big Bass:
 * Hold & Spinner » donnerait le mot « bassHold », que plus aucune requête ne
 * retrouve.
 */
export function normaliser(valeur: string): string {
  return valeur
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ce que vaut **un** mot de la requête contre un texte déjà normalisé.
 *
 * L'échelle va de 0 à 200 et se lit de haut en bas : égalité totale, début du
 * texte, mot entier, début d'un mot, puis les cas où le terme est simplement
 * présent quelque part.
 */
export function scoreTerme(terme: string, texte: string): number {
  if (!terme || !texte) return 0;
  if (texte === terme) return 200;
  if (texte.startsWith(`${terme} `)) return 150;

  const mots = texte.split(' ');
  if (mots.includes(terme)) return 120;
  if (mots.some((mot) => mot.startsWith(terme))) return 90;
  if (texte.startsWith(terme)) return 70;
  if (texte.includes(terme)) return 40;
  return 0;
}

/**
 * Ce que vaut une requête entière contre un texte.
 *
 * ── Pourquoi les mots manquants comptent plus que les mots trouvés ────────
 *
 * « sweet bonanza » ne doit pas ressortir tous les jeux qui contiennent
 * « sweet ». Un mot sans correspondance disqualifie donc le résultat dès qu'il
 * représente la moitié de la requête : deux mots sur deux doivent être là, et
 * sur trois mots on tolère qu'un manque.
 */
export function score(requete: string, texte: string): number {
  const q = normaliser(requete);
  const t = normaliser(texte);
  if (!q || !t) return 0;
  if (t === q) return 200;
  if (t.startsWith(q)) return 165;

  const mots = q.split(' ').filter(Boolean);
  if (mots.length === 1) return scoreTerme(mots[0], t);

  let cumul = 0;
  let poids = 0;
  let manquants = 0;
  for (const mot of mots) {
    const s = scoreTerme(mot, t);
    if (s === 0) manquants += 1;
    // Un mot long porte plus d'information qu'un article : « of » ne doit pas
    // peser autant que « bonanza » dans la moyenne.
    const p = Math.max(1, mot.length);
    cumul += s * p;
    poids += p;
  }
  if (manquants >= Math.ceil(mots.length / 2)) return 0;

  let moyenne = cumul / poids;
  if (manquants === 0) moyenne += 20;
  // Les mots dans l'ordre de la requête valent mieux que les mêmes mots
  // dispersés : « big bass » doit battre « Bass Fishing Big Catch ».
  if (manquants === 0 && t.includes(mots.join(' '))) moyenne += 30;
  return Math.min(200, moyenne);
}

/**
 * Le meilleur score parmi plusieurs textes, avec une pondération par texte.
 *
 * Le nom du jeu compte plein pot ; le nom de son studio compte moins, sinon
 * une requête « pragmatic » sortirait sept cents jeux avant le studio
 * lui-même.
 */
export function meilleurScore(requete: string, textes: Array<[string, number]>): number {
  let meilleur = 0;
  for (const [texte, poids] of textes) {
    const s = score(requete, texte) * poids;
    if (s > meilleur) meilleur = s;
  }
  return meilleur;
}
