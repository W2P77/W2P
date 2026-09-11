/**
 * La notification Discord d'un clic sortant, côté where2spin.
 *
 * ── Pourquoi le même salon que BetsRank ───────────────────────────────────
 *
 * Les deux sites partagent le Redis, le postback et le même staff : ouvrir un
 * second salon obligerait à regarder à deux endroits pour suivre un flux qui
 * est unique. Les messages vont donc dans #staff-flux-clicks, et c'est le
 * message qui dit d'où vient le clic — pas le salon.
 *
 * ── Ce qui distingue les deux sources ─────────────────────────────────────
 *
 * Trois marques, dans le même message : le champ **Site**, la couleur de
 * l'embed (cyan where2spin, bleu BetsRank) et le préfixe du clickId, `w2p-`,
 * qui est la seule marque à survivre jusqu'à la conversion. Les deux premières
 * servent l'œil ; la troisième sert l'attribution.
 *
 * ── Jamais bloquant ───────────────────────────────────────────────────────
 *
 * Un salon absent, un jeton manquant, Discord en panne : le visiteur part
 * quand même. Cette fonction n'échoue pas, elle renonce.
 */
const API = 'https://discord.com/api/v10';

interface Salon {
  id: string;
  name: string;
}

async function discord<T>(chemin: string, init?: RequestInit): Promise<T | null> {
  const jeton = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!jeton) return null;
  try {
    const reponse = await fetch(`${API}${chemin}`, {
      ...init,
      headers: {
        Authorization: `Bot ${jeton}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    if (!reponse.ok) return null;
    return (await reponse.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Le salon du flux de clics, résolu par son nom.
 *
 * Le nom porte un emoji côté Discord (« 🖱️・staff-flux-clicks ») : on compare
 * donc sur la fin du nom, jamais sur l'égalité stricte. L'identifiant peut
 * aussi être donné en variable d'environnement, ce qui évite l'appel.
 */
let salonEnCache: string | null = null;
async function salonDuFlux(guildId: string): Promise<string | null> {
  const force = process.env.DISCORD_SALON_FLUX_CLICS?.trim();
  if (force) return force;
  if (salonEnCache) return salonEnCache;
  const salons = await discord<Salon[]>(`/guilds/${guildId}/channels`);
  if (!salons) return null;
  const cible =
    salons.find((s) => s.name.endsWith('staff-flux-clicks')) ??
    salons.find((s) => s.name.endsWith('staff-flux-ftd'));
  salonEnCache = cible?.id ?? null;
  return salonEnCache;
}

export interface ClicANotifier {
  casinoNom: string;
  casinoSlug: string;
  clickId: string;
  jeu?: string | null;
  pays?: string | null;
}

export async function notifierClicDiscord(clic: ClicANotifier): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) return false;

  const salon = await salonDuFlux(guildId);
  if (!salon) return false;

  const champs = [
    { name: 'Site', value: '🔷 where2spin', inline: true },
    { name: 'Casino', value: `**${clic.casinoNom}**`, inline: true },
    ...(clic.jeu ? [{ name: 'Machine', value: clic.jeu, inline: true }] : []),
    ...(clic.pays ? [{ name: 'Pays', value: clic.pays, inline: true }] : []),
    { name: 'Click ID', value: `\`${clic.clickId}\``, inline: false },
  ];

  const envoi = await discord(`/channels/${salon}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [
        {
          title: `🖱️ Clic where2spin — ${clic.casinoNom}`,
          fields: champs,
          color: 0x2fd8f5, // cyan néon : la couleur du site, pas celle de BetsRank
          footer: { text: 'where2spin • /go' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  return envoi !== null;
}
