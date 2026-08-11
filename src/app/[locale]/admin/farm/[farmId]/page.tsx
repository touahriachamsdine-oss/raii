import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { format, parseISO, isValid } from 'date-fns';
import { getFarmDetails } from '@/lib/actions/admin';
import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { FarmDownloadButton } from '@/components/admin/farm-download-button';

type Farm = { id: string; name: string; country: string; timezone: string; };
type UserProfile = { id: string; displayName: string; email: string; role: string; };
type Animal = { id: string; species: string; breed: string; dob: string; gender: string; status: string; };

const formatDisplayDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'MMM d, yyyy');
    }
    return dateString;
  } catch {
    return dateString;
  }
};

export default async function FarmDetailPage({ params }: { params: Promise<{ farmId: string, locale: string }> }) {
  const { farmId, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  const { farm, users, animals } = await getFarmDetails(farmId) as { farm: Farm, users: UserProfile[], animals: Animal[] };

  if (!farm) {
    return <div>Farm not found</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {farm.name}
          </h1>
          <p className="text-muted-foreground">
            {t('Admin.farmDetail.description')}
          </p>
        </div>
        <FarmDownloadButton animals={animals} farmName={farm.name} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users /> {t('Admin.farmDetail.users.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {users?.map(user => (
                  <li key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div className='flex items-center gap-2'>
                      <User className='text-muted-foreground' />
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge>{user.role}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Admin.farmDetail.animals.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('AnimalsPage.tableHeaders.id')}</TableHead>
                      <TableHead>{t('AnimalsPage.tableHeaders.species')}</TableHead>
                      <TableHead>{t('AnimalsPage.tableHeaders.breed')}</TableHead>
                      <TableHead>{t('AnimalsPage.tableHeaders.dob')}</TableHead>
                      <TableHead>{t('AnimalsPage.tableHeaders.gender')}</TableHead>
                      <TableHead>{t('AnimalsPage.tableHeaders.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animals?.map(animal => (
                      <TableRow key={animal.id}>
                        <TableCell>{animal.id}</TableCell>
                        <TableCell>{animal.species}</TableCell>
                        <TableCell>{animal.breed}</TableCell>
                        <TableCell>{formatDisplayDate(animal.dob)}</TableCell>
                        <TableCell>{animal.gender}</TableCell>
                        <TableCell>{animal.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
