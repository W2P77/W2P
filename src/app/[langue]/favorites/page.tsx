import type { Metadata } from 'next';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { Tirets } from '@/components/DecorNeon';
import { MesJeux } from '@/components/MesJeux';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';
import { metadonneesDePage } from '@/lib/metadonnees';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  const langue = estUneLangue(brut) ? brut : LANGUE_DEFAUT;
  const t = textes(langue);
  return metadonneesDePage({
    titre: t.titrePageFavoris,
    description: t.descPageFavoris,
    chemin: '/favorites',
    langue,
  });
}

export default async function Favoris({
  params,
}: {
  params: Promise<{ langue: string }>;
}) {
  const { langue: brutL } = await params;
  const t = textes(estUneLangue(brutL) ? brutL : LANGUE_DEFAUT);
  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            {t.titreFavoris}
          </h1>
          <Tirets />
        </div>
        <p className="mb-6 max-w-2xl text-[13px] text-texte-doux">
          {t.accrocheFavoris}
        </p>
        <MesJeux />
      </main>
      <PiedDePage />
    </div>
  );
}
