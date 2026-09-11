/**
 * La notification d'un clic ne retient jamais le visiteur.
 *
 * Elle part d'une page de sortie : si le jeton manque, si le salon est
 * introuvable, si Discord répond mal, le départ vers le partenaire doit avoir
 * lieu quand même. Ces tests fixent ce contrat — renoncer, jamais lever.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { notifierClicDiscord } from '../discord/notif-clic';

const CLIC = { casinoNom: 'Betti', casinoSlug: 'betti', clickId: 'w2p-abc', jeu: 'sweet-bonanza' };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('notification Discord d’un clic sortant', () => {
  it('renonce sans serveur configuré, sans lever', async () => {
    vi.stubEnv('DISCORD_GUILD_ID', '');
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('renonce quand Discord refuse, sans lever', async () => {
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('renonce quand le réseau tombe, sans lever', async () => {
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('poste dans le salon et marque le site', async () => {
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    const envoi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'm1' }) });
    vi.stubGlobal('fetch', envoi);
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(true);
    const [url, init] = envoi.mock.calls[0];
    expect(url).toContain('/channels/456/messages');
    const corps = JSON.parse((init as RequestInit).body as string);
    expect(corps.embeds[0].fields[0]).toEqual({ name: 'Site', value: '🔷 where2spin', inline: true });
    expect(corps.embeds[0].fields.at(-1).value).toContain('w2p-');
  });
});
