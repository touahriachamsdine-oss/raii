import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { getDeviceDetail, getDeviceReadings } from '@/lib/actions/iot';
import { DeviceDetailClient } from './device-detail-client';

export default async function DeviceDetailPage({
    params,
}: {
    params: Promise<{ deviceId: string; locale: string }>;
}) {
    const { deviceId, locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('IoTPage');

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const device = await getDeviceDetail(deviceId);
    if (!device) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">{t('deviceNotFound')}</p>
            </div>
        );
    }

    const readings = await getDeviceReadings(deviceId, 200);

    return <DeviceDetailClient device={device} initialReadings={readings} />;
}
