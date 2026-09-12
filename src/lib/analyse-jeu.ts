import type { Langue } from '@/i18n/langues';

/**
 * Le texte d'analyse sous la liste des casinos.
 *
 * ── Pourquoi la fiche était courte ────────────────────────────────────────
 *
 * Une fiche affichait 679 mots, dont la moitié en étiquettes et en noms de
 * casinos. Sur une requête que des dizaines de sites visent — « gates of
 * olympus rtp » — une page qui ne développe rien n'a aucune raison de passer
 * devant celles qui développent.
 *
 * ── Ce qui est écrit ici, et ce qui ne peut pas l'être ────────────────────
 *
 * Chaque phrase est **dérivée d'un champ de la base**. Un fait absent ne
 * produit pas de phrase : il n'y a pas de formule de remplissage, pas de
 * « ce jeu offre une expérience captivante », pas de superlatif. C'est la
 * règle du projet — on n'invente rien — et c'est aussi ce qui fait la valeur
 * du texte : il dit ce que les autres ne savent pas dire, parce qu'ils n'ont
 * pas relevé le chiffre dans la démo.
 *
 * Les sections sont donc de longueur variable selon ce qu'on sait du jeu.
 * Une fiche sans RTP n'est de toute façon pas proposée aux moteurs
 * (`estPublieable`).
 */

export interface FaitsDuJeu {
  nom: string;
  studio: string;
  rtp: number | null;
  paliers: number[];
  rtpAchatBonus: number | null;
  rtpSource: string | null;
  rtpConfiance: 'STUDIO' | 'RECOUPE' | 'UNIQUE' | 'AUCUNE';
  volatilite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'TRES_HAUTE' | null;
  gainMax: number | null;
  grille: string | null;
  lignes: string | null;
  mecaniques: string[];
  achatBonus: boolean | null;
  sortieLe: Date | null;
  capturesLe: Date | null;
  nbCaptures: number;
  nbCasinos: number;
  demo: boolean;
  /**
   * Une table live, pas une machine.
   *
   * Les deux phrases qui parlent de « la mise totale » n'y valent rien : une
   * cote de blackjack ou de roulette porte sur **une case de mise**, pas sur
   * ce qu'on a engagé sur le tapis. Écrire « 25 000x la mise totale » sur
   * Lightning Blackjack serait un chiffre juste et une phrase fausse — et la
   * grille d'une table (« Live Studio ») n'est pas une grille non plus.
   */
  estLive: boolean;
}

export interface Section {
  titre: string;
  paragraphes: string[];
}

const LOCALE: Record<Langue, string> = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE' };

function nombre(n: number, langue: Langue): string {
  return new Intl.NumberFormat(LOCALE[langue]).format(n);
}

function taux(n: number, langue: Langue): string {
  return langue === 'en' ? `${n.toFixed(2)}%` : `${n.toFixed(2).replace('.', ',')} %`;
}

function annee(d: Date | null): string | null {
  return d ? String(d.getFullYear()) : null;
}

function dateLongue(d: Date, langue: Langue): string {
  return d.toLocaleDateString(LOCALE[langue], { day: 'numeric', month: 'long', year: 'numeric' });
}

const VOLATILITE: Record<Langue, Record<string, string>> = {
  en: { BASSE: 'low', MOYENNE: 'medium', HAUTE: 'high', TRES_HAUTE: 'very high' },
  fr: { BASSE: 'basse', MOYENNE: 'moyenne', HAUTE: 'haute', TRES_HAUTE: 'très haute' },
  de: { BASSE: 'niedrig', MOYENNE: 'mittel', HAUTE: 'hoch', TRES_HAUTE: 'sehr hoch' },
};

/*
 * L'allemand fléchit l'adjectif : « eine hohe Volatilität », pas « eine
 * hoche ». Coller un `e` au radical donnait la seconde forme sur toutes les
 * fiches allemandes à volatilité haute.
 */
const VOLATILITE_FLECHIE: Record<string, string> = {
  BASSE: 'niedrige',
  MOYENNE: 'mittlere',
  HAUTE: 'hohe',
  TRES_HAUTE: 'sehr hohe',
};

/* Les formulations, par langue. Elles ne prennent que des faits en entrée. */
const M = {
  en: {
    titreRtp: (j: string) => `The RTP of ${j}`,
    rtp: (j: string, r: string) => `${j} is published with an RTP of ${r}.`,
    source: (h: string) => `The figure comes from ${h}, and the page is linked above so you can check it yourself.`,
    recoupe: 'The figure is cross-checked against two independent sources, but we do not hold a studio page for it.',
    unique: 'The figure rests on a single source that we have not been able to cross-check. It is shown as such rather than presented with a confidence we do not have.',
    aucune: 'We have not confirmed this figure at the studio, and we say so rather than copying a number found elsewhere.',
    paliers: (l: string) =>
      `Operators may run a lower configuration: ${l}. The paytable inside the game is the only figure that applies to the session you are playing.`,
    achat: (r: string) =>
      `Buying the bonus changes the return, which is then ${r}. It is a different figure from the base game, and the two get quoted interchangeably on comparison sites.`,
    titreVolatilite: 'Volatility',
    volatilite: (j: string, v: string, s: string) =>
      `${s} states a ${v} volatility for ${j}. Studios measure volatility on their own scales, so we report what the studio says rather than converting it to a scale of our own.`,
    sansVolatilite: (j: string) =>
      `${j} has no published volatility that we could verify, so the field is left empty. Filling it with "medium" would read as information while being a guess.`,
    titreGain: 'Maximum win',
    gain: (j: string, g: string) =>
      `The ceiling announced for ${j} is ${g} the total stake. A maximum win is a cap, not an expectation: it is the largest payout the game can produce, reached by a combination that the mathematics make rare.`,
    titreJouer: (j: string) => `How ${j} is built`,
    grille: (g: string) => `The game runs on a ${g} grid`,
    lignes: (l: string) => `${l} paylines`,
    lignesTexte: (v: string) => `Its wins form through ${v}.`,
    mecaniques: (m: string) => `Its mechanics are: ${m}.`,
    achatOui: 'A bonus buy is available.',
    achatNon: 'There is no bonus buy.',
    sortie: (j: string, a: string, s: string) => `${j} was released by ${s} in ${a}.`,
    titreVerif: 'What we checked',
    captures: (n: number, d: string) =>
      `The ${n} screenshots on this page were taken in the studio's own demo on ${d}, not copied from another site. The figures above are read from those screens.`,
    ouJouer: (n: number, j: string) =>
      `${n} of our partner casinos carry this studio's games. We list where ${j} can be played; we do not rank the operators by what they pay us.`,
  },
  fr: {
    titreRtp: (j: string) => `Le RTP de ${j}`,
    rtp: (j: string, r: string) => `${j} est publié avec un RTP de ${r}.`,
    source: (h: string) => `Le chiffre vient de ${h}, et la page est liée plus haut pour que tu puisses la vérifier toi-même.`,
    recoupe: 'Le chiffre est recoupé par deux sources indépendantes, mais nous ne détenons pas de page du studio pour l’appuyer.',
    unique: 'Le chiffre repose sur une seule source que nous n’avons pas pu recouper. Il est affiché comme tel, plutôt que présenté avec une assurance que nous n’avons pas.',
    aucune: 'Nous n’avons pas confirmé ce chiffre auprès du studio, et nous le disons plutôt que de recopier une valeur trouvée ailleurs.',
    paliers: (l: string) =>
      `Un opérateur peut faire tourner une configuration plus basse : ${l}. La table des gains affichée dans le jeu est le seul chiffre qui s’applique à la session que tu joues.`,
    achat: (r: string) =>
      `Acheter le bonus change le taux de retour, qui vaut alors ${r}. C’est un chiffre différent de celui du jeu de base, et les deux sont régulièrement confondus sur les comparateurs.`,
    titreVolatilite: 'La volatilité',
    volatilite: (j: string, v: string, s: string) =>
      `${s} annonce une volatilité ${v} pour ${j}. Chaque studio mesure la volatilité sur sa propre échelle : nous rapportons ce que le studio dit, sans le convertir sur une échelle maison.`,
    sansVolatilite: (j: string) =>
      `${j} n’a pas de volatilité publiée que nous ayons pu vérifier, donc le champ reste vide. Le remplir avec « moyenne » se lirait comme une information alors que ce serait une supposition.`,
    titreGain: 'Le gain maximum',
    gain: (j: string, g: string) =>
      `Le plafond annoncé pour ${j} est de ${g} la mise totale. Un gain maximum est une limite, pas une attente : c’est le paiement le plus élevé que le jeu peut produire, atteint par une combinaison que les mathématiques rendent rare.`,
    titreJouer: (j: string) => `Comment ${j} est construit`,
    grille: (g: string) => `Le jeu tourne sur une grille ${g}`,
    lignes: (l: string) => `${l} lignes de paiement`,
    lignesTexte: (v: string) => `Ses gains se forment en ${v}.`,
    mecaniques: (m: string) => `Ses mécaniques sont : ${m}.`,
    achatOui: 'Un achat de bonus est disponible.',
    achatNon: 'Il n’y a pas d’achat de bonus.',
    sortie: (j: string, a: string, s: string) => `${j} est sorti chez ${s} en ${a}.`,
    titreVerif: 'Ce que nous avons vérifié',
    captures: (n: number, d: string) =>
      `Les ${n} captures de cette page ont été prises dans la démo officielle du studio le ${d}, pas recopiées d’un autre site. Les chiffres ci-dessus sont lus sur ces écrans.`,
    ouJouer: (n: number, j: string) =>
      `${n} de nos casinos partenaires distribuent les jeux de ce studio. Nous indiquons où ${j} peut se jouer ; nous ne classons pas les opérateurs selon ce qu’ils nous versent.`,
  },
  de: {
    titreRtp: (j: string) => `Der RTP von ${j}`,
    rtp: (j: string, r: string) => `${j} wird mit einem RTP von ${r} veröffentlicht.`,
    source: (h: string) => `Die Zahl stammt von ${h}, und die Seite ist oben verlinkt, damit du sie selbst prüfen kannst.`,
    recoupe: 'Die Zahl ist durch zwei unabhängige Quellen bestätigt, eine Studioseite liegt uns dafür aber nicht vor.',
    unique: 'Die Zahl stützt sich auf eine einzige Quelle, die wir nicht gegenprüfen konnten. Sie wird als solche gekennzeichnet, statt mit einer Sicherheit präsentiert zu werden, die wir nicht haben.',
    aucune: 'Wir haben diese Zahl nicht beim Studio bestätigt, und wir sagen das, statt einen anderswo gefundenen Wert abzuschreiben.',
    paliers: (l: string) =>
      `Ein Betreiber kann eine niedrigere Konfiguration einsetzen: ${l}. Die Gewinntabelle im Spiel ist die einzige Zahl, die für deine Sitzung gilt.`,
    achat: (r: string) =>
      `Ein Bonuskauf verändert die Auszahlungsquote, die dann ${r} beträgt. Das ist eine andere Zahl als die des Basisspiels, und beide werden auf Vergleichsseiten regelmäßig verwechselt.`,
    titreVolatilite: 'Die Volatilität',
    volatilite: (j: string, v: string, s: string) =>
      `${s} gibt für ${j} eine ${v} Volatilität an. Jedes Studio misst Volatilität auf seiner eigenen Skala: Wir geben wieder, was das Studio sagt, statt es auf eine eigene Skala umzurechnen.`,
    sansVolatilite: (j: string) =>
      `Für ${j} ist keine Volatilität veröffentlicht, die wir prüfen konnten, deshalb bleibt das Feld leer. Es mit „mittel“ zu füllen, läse sich wie eine Information, wäre aber eine Vermutung.`,
    titreGain: 'Der Maximalgewinn',
    gain: (j: string, g: string) =>
      `Die für ${j} genannte Obergrenze liegt bei ${g} des Gesamteinsatzes. Ein Maximalgewinn ist eine Grenze, keine Erwartung: Es ist die höchste Auszahlung, die das Spiel erzeugen kann, erreicht durch eine Kombination, die die Mathematik selten macht.`,
    titreJouer: (j: string) => `Wie ${j} aufgebaut ist`,
    grille: (g: string) => `Das Spiel läuft auf einem ${g}-Raster`,
    lignes: (l: string) => `${l} Gewinnlinien`,
    lignesTexte: (v: string) => `Seine Gewinne entstehen über ${v}.`,
    mecaniques: (m: string) => `Seine Mechaniken sind: ${m}.`,
    achatOui: 'Ein Bonuskauf ist verfügbar.',
    achatNon: 'Es gibt keinen Bonuskauf.',
    sortie: (j: string, a: string, s: string) => `${j} erschien ${a} bei ${s}.`,
    titreVerif: 'Was wir geprüft haben',
    captures: (n: number, d: string) =>
      `Die ${n} Screenshots auf dieser Seite entstanden am ${d} in der offiziellen Demo des Studios, sie sind nicht von einer anderen Seite kopiert. Die Zahlen oben sind von diesen Bildschirmen abgelesen.`,
    ouJouer: (n: number, j: string) =>
      `${n} unserer Partnercasinos führen die Spiele dieses Studios. Wir zeigen, wo ${j} gespielt werden kann; wir ordnen die Betreiber nicht danach, was sie uns zahlen.`,
  },
} as const;

/**
 * Reconnaître une table live à ce que la base en dit.
 *
 * Il n'y a pas de champ pour ça : le signal est dans la grille (« Live
 * Studio ») et dans les mécaniques (« Dealer HD 24/7 »). On préfère un faux
 * positif — une section de moins — à une phrase fausse.
 */
export function estUneTableLive(grille: string | null, mecaniques: string[]): boolean {
  const tout = [grille ?? '', ...mecaniques].join(' ');
  return /\b(live|dealer|croupier)\b/i.test(tout);
}

/** L'hôte d'une source, sans le `www.` : c'est ce qu'on cite dans le texte. */
function hote(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function sectionsAnalyse(f: FaitsDuJeu, langue: Langue): Section[] {
  const m = M[langue];
  const sections: Section[] = [];

  // ── Le RTP ───────────────────────────────────────────────────────────────
  if (f.rtp != null) {
    const p = [m.rtp(f.nom, taux(f.rtp, langue))];
    const h = f.rtpSource ? hote(f.rtpSource) : null;
    if (f.rtpConfiance === 'STUDIO' && h) p.push(m.source(h));
    else if (f.rtpConfiance === 'RECOUPE') p.push(m.recoupe);
    else if (f.rtpConfiance === 'UNIQUE') p.push(m.unique);
    else if (f.rtpConfiance === 'AUCUNE') p.push(m.aucune);

    if (f.paliers.length) p.push(m.paliers(f.paliers.map((x) => taux(x, langue)).join(' · ')));
    if (f.rtpAchatBonus != null) p.push(m.achat(taux(f.rtpAchatBonus, langue)));
    sections.push({ titre: m.titreRtp(f.nom), paragraphes: p });
  }

  // ── La volatilité ────────────────────────────────────────────────────────
  sections.push({
    titre: m.titreVolatilite,
    paragraphes: [
      f.volatilite
        ? m.volatilite(
            f.nom,
            langue === 'de' ? VOLATILITE_FLECHIE[f.volatilite] : VOLATILITE[langue][f.volatilite],
            f.studio,
          )
        : m.sansVolatilite(f.nom),
    ],
  });

  // ── Le gain maximum ──────────────────────────────────────────────────────
  if (f.gainMax != null && !f.estLive) {
    sections.push({
      titre: m.titreGain,
      paragraphes: [m.gain(f.nom, `${nombre(f.gainMax, langue)}x`)],
    });
  }

  // ── La construction du jeu ───────────────────────────────────────────────
  const construction: string[] = [];
  /*
   * `lignesPaiement` n'est pas toujours un nombre.
   *
   * Chez Pragmatic il vaut « Pay Anywhere (8+ symbols) », chez d'autres
   * « 117,649 ways ». Le traiter comme un compte produisait « Pay Anywhere
   * (8+ symbols) lignes de paiement » — une phrase qui ne veut rien dire, sur
   * une part entière du catalogue.
   */
  const estUnNombre = f.lignes != null && /^\d[\d\s,.]*$/.test(f.lignes.trim());
  const forme = [
    f.grille && !f.estLive ? m.grille(f.grille) : null,
    f.lignes && estUnNombre ? m.lignes(f.lignes) : null,
  ].filter(Boolean) as string[];
  if (forme.length) construction.push(`${forme.join(', ')}.`);
  if (f.lignes && !estUnNombre && !f.estLive) construction.push(m.lignesTexte(f.lignes));
  if (f.mecaniques.length) construction.push(m.mecaniques(f.mecaniques.join(', ')));
  if (f.achatBonus != null) construction.push(f.achatBonus ? m.achatOui : m.achatNon);
  const a = annee(f.sortieLe);
  if (a) construction.push(m.sortie(f.nom, a, f.studio));
  if (construction.length) {
    sections.push({ titre: m.titreJouer(f.nom), paragraphes: [construction.join(' ')] });
  }

  // ── Ce qu'on a vérifié soi-même ──────────────────────────────────────────
  const verif: string[] = [];
  if (f.nbCaptures > 0 && f.capturesLe) {
    verif.push(m.captures(f.nbCaptures, dateLongue(f.capturesLe, langue)));
  }
  if (f.nbCasinos > 0) verif.push(m.ouJouer(f.nbCasinos, f.nom));
  if (verif.length) sections.push({ titre: m.titreVerif, paragraphes: verif });

  return sections;
}

export interface Question {
  question: string;
  reponse: string;
}

/**
 * Les questions posées sur un jeu, et leurs réponses.
 *
 * Elles sont déclarées en `FAQPage` dans le balisage : c'est ce qui permet à
 * une réponse d'apparaître directement dans les résultats. D'où la règle —
 * **une question n'est posée que si le fait existe**. Une FAQ qui répond
 * « nous ne savons pas » à une question qu'elle a elle-même posée est une
 * mauvaise réponse offerte à Google, et un mauvais signal pour la page.
 */
const Q = {
  en: {
    rtp: (j: string) => `What is the RTP of ${j}?`,
    rtpRep: (j: string, r: string, c: string) => `${j} is published with an RTP of ${r}. ${c}`,
    certifie: 'We hold the studio page stating it, and it is linked from this page.',
    incertain: 'We have not been able to confirm it at the studio, and the figure is marked accordingly.',
    achat: (j: string) => `Does ${j} have a bonus buy?`,
    achatOui: (j: string) => `Yes. ${j} lets you buy the feature directly.`,
    achatOuiTaux: (r: string) => ` The return on a bonus purchase is ${r}, a different figure from the base game.`,
    achatNon: (j: string) => `No. ${j} has no bonus buy: the feature is only reached in normal play.`,
    gain: (j: string) => `What is the maximum win on ${j}?`,
    gainRep: (j: string, g: string) => `The ceiling announced for ${j} is ${g} the total stake.`,
    volatilite: (j: string) => `How volatile is ${j}?`,
    volatiliteRep: (s: string, v: string, j: string) => `${s} states a ${v} volatility for ${j}.`,
    demo: (j: string) => `Can I play ${j} for free?`,
    demoRep: (j: string) => `Yes. The free demo of ${j} opens on the studio's own page, without an account and without a deposit.`,
    ou: (j: string) => `Where can I play ${j}?`,
    ouRep: (n: number, j: string) => `${n} of our partner casinos carry this studio's games; they are listed above on this page. A brand-new release may stay exclusive to one operator for a few weeks.`,
  },
  fr: {
    rtp: (j: string) => `Quel est le RTP de ${j} ?`,
    rtpRep: (j: string, r: string, c: string) => `${j} est publié avec un RTP de ${r}. ${c}`,
    certifie: 'Nous détenons la page du studio qui l’indique, et elle est liée depuis cette fiche.',
    incertain: 'Nous n’avons pas pu le confirmer auprès du studio, et le chiffre est signalé comme tel.',
    achat: (j: string) => `${j} a-t-il un achat de bonus ?`,
    achatOui: (j: string) => `Oui. ${j} permet d’acheter la fonctionnalité directement.`,
    achatOuiTaux: (r: string) => ` Le taux de retour d’un achat de bonus est de ${r}, un chiffre différent de celui du jeu de base.`,
    achatNon: (j: string) => `Non. ${j} n’a pas d’achat de bonus : la fonctionnalité ne s’atteint qu’en jeu normal.`,
    gain: (j: string) => `Quel est le gain maximum de ${j} ?`,
    gainRep: (j: string, g: string) => `Le plafond annoncé pour ${j} est de ${g} la mise totale.`,
    volatilite: (j: string) => `Quelle est la volatilité de ${j} ?`,
    volatiliteRep: (s: string, v: string, j: string) => `${s} annonce une volatilité ${v} pour ${j}.`,
    demo: (j: string) => `Peut-on jouer à ${j} gratuitement ?`,
    demoRep: (j: string) => `Oui. La démo gratuite de ${j} s’ouvre sur la page du studio lui-même, sans compte et sans dépôt.`,
    ou: (j: string) => `Où jouer à ${j} ?`,
    ouRep: (n: number, j: string) => `${n} de nos casinos partenaires distribuent les jeux de ce studio ; ils sont listés plus haut sur cette page. Une nouveauté peut rester quelques semaines en exclusivité chez un seul opérateur.`,
  },
  de: {
    rtp: (j: string) => `Wie hoch ist der RTP von ${j}?`,
    rtpRep: (j: string, r: string, c: string) => `${j} wird mit einem RTP von ${r} veröffentlicht. ${c}`,
    certifie: 'Uns liegt die Studioseite vor, die ihn nennt, und sie ist von dieser Seite aus verlinkt.',
    incertain: 'Wir konnten ihn beim Studio nicht bestätigen, und die Zahl ist entsprechend gekennzeichnet.',
    achat: (j: string) => `Hat ${j} einen Bonuskauf?`,
    achatOui: (j: string) => `Ja. Bei ${j} lässt sich die Funktion direkt kaufen.`,
    achatOuiTaux: (r: string) => ` Die Quote bei einem Bonuskauf beträgt ${r} — eine andere Zahl als die des Basisspiels.`,
    achatNon: (j: string) => `Nein. ${j} hat keinen Bonuskauf: Die Funktion wird nur im normalen Spiel erreicht.`,
    gain: (j: string) => `Wie hoch ist der Maximalgewinn bei ${j}?`,
    gainRep: (j: string, g: string) => `Die für ${j} genannte Obergrenze liegt bei ${g} des Gesamteinsatzes.`,
    volatilite: (j: string) => `Wie volatil ist ${j}?`,
    volatiliteRep: (s: string, v: string, j: string) => `${s} gibt für ${j} eine ${v} Volatilität an.`,
    demo: (j: string) => `Kann man ${j} kostenlos spielen?`,
    demoRep: (j: string) => `Ja. Die Gratis-Demo von ${j} öffnet sich auf der Seite des Studios selbst — ohne Konto und ohne Einzahlung.`,
    ou: (j: string) => `Wo kann man ${j} spielen?`,
    ouRep: (n: number, j: string) => `${n} unserer Partnercasinos führen die Spiele dieses Studios; sie sind oben auf dieser Seite aufgeführt. Eine Neuheit kann einige Wochen lang exklusiv bei einem einzigen Anbieter bleiben.`,
  },
} as const;

export function questionsFrequentes(f: FaitsDuJeu, langue: Langue): Question[] {
  const q = Q[langue];
  const questions: Question[] = [];

  if (f.rtp != null) {
    questions.push({
      question: q.rtp(f.nom),
      reponse: q.rtpRep(
        f.nom,
        taux(f.rtp, langue),
        f.rtpConfiance === 'STUDIO' && f.rtpSource ? q.certifie : q.incertain,
      ),
    });
  }

  if (f.gainMax != null && !f.estLive) {
    questions.push({ question: q.gain(f.nom), reponse: q.gainRep(f.nom, `${nombre(f.gainMax, langue)}x`) });
  }

  if (f.achatBonus != null) {
    const base = f.achatBonus ? q.achatOui(f.nom) : q.achatNon(f.nom);
    const suite = f.achatBonus && f.rtpAchatBonus != null ? q.achatOuiTaux(taux(f.rtpAchatBonus, langue)) : '';
    questions.push({ question: q.achat(f.nom), reponse: base + suite });
  }

  if (f.volatilite) {
    questions.push({
      question: q.volatilite(f.nom),
      reponse: q.volatiliteRep(
        f.studio,
        langue === 'de' ? VOLATILITE_FLECHIE[f.volatilite] : VOLATILITE[langue][f.volatilite],
        f.nom,
      ),
    });
  }

  if (f.demo) questions.push({ question: q.demo(f.nom), reponse: q.demoRep(f.nom) });
  if (f.nbCasinos > 0) questions.push({ question: q.ou(f.nom), reponse: q.ouRep(f.nbCasinos, f.nom) });

  return questions;
}

/** Le balisage `FAQPage`, ou `null` quand il n'y a rien à déclarer. */
export function baliseFaq(questions: Question[]): object | null {
  if (!questions.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.reponse },
    })),
  };
}
