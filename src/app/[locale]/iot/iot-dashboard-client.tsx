'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { IoTDeviceWithAnimal } from '@/lib/types';
import { requestReading } from '@/lib/actions/iot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Activity, Battery, Thermometer, Heart, Radio, ExternalLink, RefreshCw } from 'lucide-react';

function getStatusColor(device: IoTDeviceWithAnimal): string {
    if (!device.last_seen_at) return 'bg-gray-400';
    const lastSeen = new Date(device.last_seen_at).getTime();
    const now = Date.now();
    const hoursAgo = (now - lastSeen) / (1000 * 60 * 60);
    if (hoursAgo < 1) return 'bg-green-500';
    if (hoursAgo < 24) return 'bg-yellow-500';
    return 'bg-red-500';
}

function getBatteryColor(level: number | null): string {
    if (level === null) return 'text-gray-400';
    if (level >= 3.5) return 'text-green-500';
    if (level >= 3.0) return 'text-yellow-500';
    return 'text-red-500';
}

export function IoTDashboardClient({ devices: initialDevices }: { devices: IoTDeviceWithAnimal[] }) {
    const t = useTranslations('IoTPage');
    const { toast } = useToast();
    const [devices, setDevices] = useState(initialDevices);
    const [requestingId, setRequestingId] = useState<string | null>(null);

    const handleRequestReading = async (deviceId: string) => {
        setRequestingId(deviceId);
        try {
            await requestReading(deviceId);
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
            setRequestingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>{t('stats.totalDevices')}</CardDescription>
                        <CardTitle className="text-2xl">{devices.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>{t('stats.online')}</CardDescription>
                        <CardTitle className="text-2xl text-green-600">
                            {devices.filter(d => {
                                if (!d.last_seen_at) return false;
                                return (Date.now() - new Date(d.last_seen_at).getTime()) < 3600000;
                            }).length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>{t('stats.linked')}</CardDescription>
                        <CardTitle className="text-2xl">{devices.filter(d => d.animal_id).length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>{t('stats.unlinked')}</CardDescription>
                        <CardTitle className="text-2xl text-yellow-600">{devices.filter(d => !d.animal_id).length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('deviceList.title')}</CardTitle>
                    <CardDescription>{t('deviceList.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>{t('deviceList.status')}</TableHead>
                                    <TableHead>{t('deviceList.deviceId')}</TableHead>
                                    <TableHead>{t('deviceList.animal')}</TableHead>
                                    <TableHead>{t('deviceList.temperature')}</TableHead>
                                    <TableHead>{t('deviceList.heartRate')}</TableHead>
                                    <TableHead>{t('deviceList.spo2')}</TableHead>
                                    <TableHead>{t('deviceList.battery')}</TableHead>
                                    <TableHead>{t('deviceList.lastSeen')}</TableHead>
                                    <TableHead className="text-right">{t('deviceList.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {t('deviceList.empty')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    devices.map((device) => (
                                        <TableRow key={device.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(device)}`} />
                                                    <span className="text-xs text-muted-foreground">
                                                        {device.last_seen_at
                                                            ? `${Math.round((Date.now() - new Date(device.last_seen_at).getTime()) / 60000)}m ago`
                                                            : 'Never'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{device.device_id}</TableCell>
                                            <TableCell>
                                                {device.animal_name ? (
                                                    <span className="font-medium">{device.animal_name}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {device.last_temperature ? (
                                                    <div className="flex items-center gap-1">
                                                        <Thermometer className="h-3 w-3 text-red-500" />
                                                        {device.last_temperature.toFixed(1)}°C
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {device.last_heart_rate ? (
                                                    <div className="flex items-center gap-1">
                                                        <Heart className="h-3 w-3 text-red-500" />
                                                        {device.last_heart_rate} BPM
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {device.last_spo2 ? (
                                                    <span>{device.last_spo2.toFixed(1)}%</span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {device.battery_level ? (
                                                    <div className="flex items-center gap-1">
                                                        <Battery className={`h-3 w-3 ${getBatteryColor(device.battery_level)}`} />
                                                        {device.battery_level.toFixed(2)}V
                                                    </div>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {device.last_seen_at
                                                    ? new Date(device.last_seen_at).toLocaleString()
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleRequestReading(device.device_id)}
                                                        disabled={requestingId === device.device_id}
                                                    >
                                                        <RefreshCw className={`h-4 w-4 ${requestingId === device.device_id ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                        <Link href={`/iot/${device.device_id}`}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
