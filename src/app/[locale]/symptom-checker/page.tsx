import { SymptomCheckerClient } from './symptom-checker-client';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUserProfile } from '@/lib/actions/profile';
import { getAnimals } from '@/lib/actions/animals';
import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SymptomCheckerPage' });

  return {
    title: t('metadata.title'),
  };
}

export default async function SymptomCheckerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('SymptomCheckerPage');

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const userProfile = await getUserProfile(currentUser.uid);
  const farmId = userProfile?.farmIds?.[0];
  const animals = farmId ? await getAnimals(farmId) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>
      <SymptomCheckerClient initialAnimals={animals} />
    </div>
  );
}
