'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Activity, Droplet, ShieldCheck, Siren, Heart, Skull } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser, useDoc, useMemoFirebase } from '@/lib/neon-client';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import * as React from 'react';

type DashboardStats = {
  totalAnimals: number;
  activeAnimals: number;
  deceasedAnimals: number;
  totalMilkYield: number;
  speciesBreakdown: Record<string, number>;
  openAlertsCount: number;
  reproductionCount: number;
  vaccinationsDueCount: number;
  recentConsultations: any[];
  recentAlerts: any[];
};

const StatCard = ({ title, value, subtext, icon, isLoading }: { title: string; value: string | number; subtext: string; icon: React.ElementType; isLoading: boolean; }) => {
  const Icon = icon;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
        {isLoading ? <Skeleton className="h-4 w-32 mt-1" /> : <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
};

const SpeciesBreakdownCard = ({ title, data, isLoading, t }: { title: string; data: Record<string, number>; isLoading: boolean; t: (key: string) => string; }) => {
  const total = Object.values(data || {}).reduce((sum, count) => sum + count, 0);
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{total}</div>}
        {isLoading ? <Skeleton className="h-4 w-32 mt-1" /> : <p className="text-xs text-muted-foreground">{t('Dashboard.activeAnimalsSubtext')}</p>}
        <Separator className="my-4" />
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('Dashboard.animalsBySpecies')}</h4>
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </>
          ) : data && Object.keys(data).length > 0 ? (
            Object.entries(data).map(([species, count]) => (
              <div key={species} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t(`AnimalSpecies.${species.toLowerCase()}`) || species}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No active animals found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const t = useTranslations();
  const { user } = useUser();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => (user ? { collection: 'users', id: user.uid } : null), [user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{ farmIds: string[] }>(userProfileRef);
  const farmId = userProfile?.farmIds?.[0];

  React.useEffect(() => {
    async function fetchStats() {
      if (farmId) {
        setIsStatsLoading(true);
        const data = await getDashboardStats(farmId);
        setStats(data as DashboardStats);
        setIsStatsLoading(false);
      }
    }
    fetchStats();
  }, [farmId]);

  const isLoading = isProfileLoading || isStatsLoading;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('Dashboard.title')}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SpeciesBreakdownCard
          title={t('Dashboard.activeAnimals')}
          data={stats?.speciesBreakdown || {}}
          isLoading={isLoading}
          t={t}
        />
        <StatCard
          title={t('Dashboard.milkToday')}
          value={stats?.totalMilkYield.toFixed(0) || '0'}
          subtext={t('Dashboard.milkTodaySubtext')}
          icon={Droplet}
          isLoading={isLoading}
        />
        <StatCard
          title={t('Dashboard.vaccinationsDue')}
          value={stats?.vaccinationsDueCount || 0}
          subtext={t('Dashboard.vaccinationsDueSubtext')}
          icon={ShieldCheck}
          isLoading={isLoading}
        />
        <StatCard
          title={t('Dashboard.openAlerts')}
          value={stats?.openAlertsCount || 0}
          subtext={t('Dashboard.openAlertsSubtext')}
          icon={Siren}
          isLoading={isLoading}
        />
        <StatCard
          title={t('Dashboard.reproduction')}
          value={stats?.reproductionCount || 0}
          subtext={t('Dashboard.reproductionSubtext')}
          icon={Heart}
          isLoading={isLoading}
        />
        <StatCard
          title={t('Dashboard.deceasedAnimals')}
          value={stats?.deceasedAnimals || 0}
          subtext={t('Dashboard.deceasedAnimalsSubtext')}
          icon={Skull}
          isLoading={isLoading}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('Dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : stats?.recentConsultations && stats.recentConsultations.length > 0 ? (
              <div className="space-y-4">
                {stats.recentConsultations.map((c: any) => (
                  <div key={c.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{c.animalName}</p>
                      <p className="text-sm text-muted-foreground">{c.professionalNotes}</p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('Dashboard.recentActivityPlaceholder')}</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('Dashboard.healthOverview')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
              <div className="space-y-4">
                {stats.recentAlerts.map((a: any) => (
                  <div key={a.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{a.type || 'Alert'}</p>
                      <p className="text-sm text-muted-foreground">{a.message || 'Needs attention'}</p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('Dashboard.healthOverviewPlaceholder')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
