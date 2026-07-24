'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { IoTDeviceWithAnimal, IoTReading } from '@/lib/types';
import { requestReading, getDeviceReadings } from '@/lib/actions/iot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    Activity,
    Battery,
    Thermometer,
    Heart,
    Radio,
    ArrowLeft,
    RefreshCw,
} from 'lucide-react';

function getBatteryColor(level: number | null): string {
    if (level === null) return 'text-gray-400';
    if (level >= 3.5) return 'text-green-500';
    if (level >= 3.0) return 'text-yellow-500';
    return 'text-red-500';
}

export function DeviceDetailClient({
    device,
    initialReadings,
}: {
    device: IoTDeviceWithAnimal;
    initialReadings: IoTReading[];
}) {
    const t = useTranslations('IoTPage');
    const { toast } = useToast();
    const [readings, setReadings] = useState(initialReadings);
    const [isRequesting, setIsRequesting] = useState(false);

    const refreshReadings = useCallback(async () => {
        const fresh = await getDeviceReadings(device.device_id, 200);
        if (fresh.length > 0) setReadings(fresh);
    }, [device.device_id]);

    useEffect(() => {
        const interval = setInterval(refreshReadings, 10000);
        return () => clearInterval(interval);
    }, [refreshReadings]);

    const chartData = [...readings]
        .reverse()
        .map((r) => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperature: r.temperature,
            heartRate: r.heart_rate,
            spo2: r.spo2,
        }));

    const lastReading = readings[0];

    const handleRequestReading = async () => {
        setIsRequesting(true);
        try {
            await requestReading(device.device_id);
            toast({
                title: t('requestSent'),
                description: t('requestSentDescription'),
            });
        } catch {
            toast({
                variant: 'destructive',
                title: t('requestFailed'),
                description: t('requestFailedDescription'),
            });
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/iot">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight font-mono">{device.device_id}</h1>
                        <p className="text-sm text-muted-foreground">
                            {device.animal_name ? (
                                <Link href={`/animal/${device.animal_id}`} className="underline hover:text-primary">
                                    {device.animal_name}
                                </Link>
                            ) : (
                                t('unlinked')
                            )}
                        </p>
                    </div>
                </div>
                <Button onClick={handleRequestReading} disabled={isRequesting}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRequesting ? 'animate-spin' : ''}`} />
                    {t('requestReading')}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription><Thermometer className="inline h-4 w-4 mr-1" />{t('temperature')}</CardDescription>
                        <CardTitle className="text-2xl">
                            {lastReading?.temperature ? `${lastReading.temperature.toFixed(1)}°C` : '—'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription><Heart className="inline h-4 w-4 mr-1" />{t('heartRate')}</CardDescription>
                        <CardTitle className="text-2xl">
                            {lastReading?.heart_rate ? `${lastReading.heart_rate} BPM` : '—'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription><Activity className="inline h-4 w-4 mr-1" />{t('spo2')}</CardDescription>
                        <CardTitle className="text-2xl">
                            {lastReading?.spo2 ? `${lastReading.spo2.toFixed(1)}%` : '—'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription><Battery className="inline h-4 w-4 mr-1" />{t('battery')}</CardDescription>
                        <CardTitle className={`text-2xl ${getBatteryColor(device.battery_level)}`}>
                            {device.battery_level ? `${device.battery_level.toFixed(2)}V` : '—'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('temperature')}</CardTitle>
                    <CardDescription>{t('chartDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="time" fontSize={12} />
                                <YAxis domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="temperature"
                                    name={t('temperature')}
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            {t('noData')}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('heartRate')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="heartRate"
                                        name={t('heartRate')}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                {t('noData')}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('spo2')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" fontSize={12} />
                                    <YAxis domain={[90, 100]} fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="spo2"
                                        name={t('spo2')}
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                {t('noData')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
