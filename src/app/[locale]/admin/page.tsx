import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { getFarms } from '@/lib/actions/admin';
import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

type Farm = {
  id: string;
  name: string;
  country: string;
  timezone: string;
};

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.dashboard');

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const farms = await getFarms() as Farm[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('farmList.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('farmList.farmName')}</TableHead>
                  <TableHead>{t('farmList.country')}</TableHead>
                  <TableHead>{t('farmList.locale') || 'Location'}</TableHead>
                  <TableHead><span className="sr-only">View</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farms?.map((farm) => (
                  <TableRow key={farm.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/admin/farm/${farm.id}`} className="block w-full h-full">
                        {farm.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/farm/${farm.id}`} className="block w-full h-full">
                        {farm.country}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/farm/${farm.id}`} className="block w-full h-full">
                        <Badge variant="outline">{farm.timezone}</Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/farm/${farm.id}`} className="block w-full h-full">
                        <ChevronRight className="inline-block" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
