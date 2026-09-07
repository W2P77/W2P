/**
 * Construction de l'URL partenaire, reprise de BetsRank sans réécriture.
 *
 * ── Pourquoi une copie et pas une reformulation ───────────────────────────
 *
 * Chaque ligne de `isSub1TrackingUrl` correspond à un réseau précis, et
 * plusieurs portent la trace d'une attribution perdue : Slott passé sur
 * gambru.com, SlotsGem sur novarao.com — dans les deux cas le clickId partait
 * dans un paramètre que le réseau ne renvoyait plus, et personne ne l'a vu
 * avant de compter l'argent.
 *
 * Réécrire « plus proprement » ferait perdre ce savoir. On copie, on garde les
 * commentaires, et on n'y touche que pour ajouter un réseau.
 *
 * ⚠️ Ce fichier existe en double, ici et dans BetsRank. Un nouveau réseau doit
 * être ajouté aux deux endroits.
 */

interface CasinoPlayUrlLike {
  playUrl: string;
  playUrlByCountry?: Partial<Record<string, string>>;
}

/**
 * Resout le playUrl a utiliser selon le pays du visiteur.
 * Fallback sur playUrl (offre par defaut, generalement FR) si le pays
 * n'a pas de variante dediee ou n'est pas connu.
 */
export function resolveCasinoPlayUrl(
  casino: CasinoPlayUrlLike,
  countryCode: string | null | undefined,
): string {
  if (countryCode && casino.playUrlByCountry) {
    const variant = casino.playUrlByCountry[countryCode.toUpperCase()];
    if (variant) return variant;
  }
  return casino.playUrl;
}

/**
 * Détecte si l'URL est un lien de tracking qui attend le click ID en sub1.
 *
 * Réseaux qui renvoient sub1 dans le postback :
 *   - Affise / 3SNET / Fame2Space (legacy)
 *   - Huge Partners (white-label Affise)
 *   - AlfaLeads (2026-07-07 confirmé par manager Ruslan, bascule sub4 → sub1)
 *     Trackers AlfaLeads : univerns.com, moxtop.com, auraodin.com, werywell56.xyz
 */
function isSub1TrackingUrl(playUrl: string): boolean {
  const lower = playUrl.toLowerCase();
  return (
    lower.includes('affise') ||
    lower.includes('3snet') ||
    lower.includes('clicksme.biz') || // Huge Partners (white-label Affise)
    lower.includes('hugepartners') ||
    lower.includes('g2afse.') ||
    lower.includes('.affise.') ||
    lower.includes('gmftrck.info') ||
    lower.includes('itisfine.co') ||
    lower.includes('fame.space') ||
    lower.includes('fame2space') ||
    // AlfaLeads trackers (confirmés BetsRank 2026-07-08)
    lower.includes('univerns.com') ||
    // gambru.com : Slott est passe sur ce domaine (meme pid=174401 que nos
    // offres univerns, et casino-cpa le declare AlfaLeads). Sans cette ligne
    // le clickId partait en sub4, que le reseau ne renvoie plus depuis le
    // 2026-07-07 — attribution perdue en silence.
    lower.includes('gambru.com') ||
    lower.includes('moxtop.com') ||
    // novarao.com : SlotsGem, meme reseau HELL Partners que Vave (moxtop.com).
    // Confirme par BetsRank le 2026-08-30 : HELL Partners renvoie sub1 pour les
    // DEUX. Sans cette ligne le clickId de SlotsGem partait en sub4, que le
    // reseau ne renvoie pas — attribution perdue en silence, exactement le
    // scenario deja paye sur Slott/gambru.com.
    lower.includes('novarao.com') ||
    lower.includes('auraodin.com') ||
    lower.includes('werywell56.xyz') ||
    lower.includes('alfaleads')
  );
}

/**
 * Construit l'URL de redirection partenaire avec le clickId injecté.
 * - Si playUrl contient {clickid}, le remplace par notre UUID (ex. FameCPA sub1={clickid}, 3SNET/Affise).
 * - Sinon ajoute aff_click_id (OctoCPA), sub1 (3SNET/Affise), ou sub4 (autres) en paramètre.
 * 
 * L'affid n'est PAS ajouté dans l'URL car on le récupère depuis le clickId lors du postback.
 * Cela évite de dépendre de la configuration côté partenaire et garde le contrôle total de notre côté.
 * 
 * Utilisé par l'API go/[slug] et la page go/[slug] pour que les postbacks renvoient le clickId.
 * Le système retrouve ensuite l'affilié depuis le clickId stocké dans notre base de données.
 */
export function buildAffiliateRedirectUrl(playUrl: string, clickId: string): string {
  const hasClickIdMacro = /\{clickid\}/i.test(playUrl);
  const url = playUrl.replace(/\{clickid\}/gi, clickId);
  if (hasClickIdMacro) return url;
  try {
    const u = new URL(url);
    if (playUrl.includes('octocpa.trkzen.com')) {
      u.searchParams.set('aff_click_id', clickId);
    } else if (playUrl.includes('magicclick.partners')) {
      // Magic Click : paramètre attendu = aff_click_id (rempli dans leur "Affiliate Click ID" puis renvoyé au postback)
      u.searchParams.set('aff_click_id', clickId);
    } else if (playUrl.toLowerCase().includes('hearts.partners') || playUrl.toLowerCase().includes('hearts-partners')) {
      // Hearts : on envoie notre Click ID en conversion_adv_cid ("Conversion Id in advertiser system")
      // pour que le postback conversion_adv_cid={conversion_adv_cid} renvoie notre ID (pas besoin de sub4/additional params)
      u.searchParams.set('conversion_adv_cid', clickId);
    } else if (playUrl.toLowerCase().includes('go.affision.com') || playUrl.toLowerCase().includes('.affision.com')) {
      // Affision (JackBit) : on envoie le Click ID dans plusieurs params pour couvrir tous les cas :
      // - afp = "affiliate parameter" renvoyé par [afp] dans le postback (macro principale Affision)
      // - trackingcode = renvoyé par [trackingcode] si Affision le propage (fallback)
      // - subid / sub1 = fallback supplémentaires si Affision accepte d'autres sub params
      u.searchParams.set('afp', clickId);
      u.searchParams.set('trackingcode', clickId);
      u.searchParams.set('subid', clickId);
    } else if (playUrl.toLowerCase().includes('staxaffiliates.com')) {
      // Staxino : macro confirmée par le manager (2026-07-24) = payload
      // ("The payload value you may have used when referring the customer"),
      // renvoyée telle quelle dans les 3 postbacks (Registration/FTD/Qualified player).
      u.searchParams.set('payload', clickId);
    } else if (playUrl.toLowerCase().includes('metriciumplatform.com')) {
      // Algo Affiliates : macro confirmée par le manager (2026-07-24) = aff_click_id,
      // renvoyée telle quelle dans leur postback vers /api/postback/algo-affiliates.
      u.searchParams.set('aff_click_id', clickId);
    } else if (playUrl.toLowerCase().includes('cosmobetpartners.com')) {
      // CosmoBet : même plateforme "CX" qu'Affision (macros identiques [afp]/[TrackingCode])
      // — confirmé 2026-07-13 via doc manager (afp = clickId "frequently used").
      u.searchParams.set('afp', clickId);
      u.searchParams.set('trackingcode', clickId);
    } else if (isSub1TrackingUrl(playUrl)) {
      // Affise/3SNET/Fame2space renvoient le clickid en postback via sub1
      u.searchParams.set('sub1', clickId);
    } else {
      u.searchParams.set('sub4', clickId);
    }
    return u.toString();
  } catch {
    return url;
  }
}
