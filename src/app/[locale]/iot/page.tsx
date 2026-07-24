import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getUserProfile } from '@/lib/actions/profile';
import { redirect } from 'next/navigation';
import { getDevices } from '@/lib/actions/iot';
import { IoTDashboardClient } from './iot-dashboard-client';

export default async function IoTPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('IoTPage');

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const userProfile = await getUserProfile(user.uid);
    const farmId = userProfile?.farmIds?.[0];
    const devices = farmId ? await getDevices(farmId) : [];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <IoTDashboardClient devices={devices} />
        </div>
    );
}
