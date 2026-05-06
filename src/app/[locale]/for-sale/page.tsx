import React from 'react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid } from 'date-fns';
import { getForSaleAnimals, ForSaleAnimal } from '@/lib/actions/marketplace';

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

const AnimalDetail = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
};

export default async function ForSalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ForSalePage');
  const tAnimalPage = await getTranslations('AnimalsPage');
  const tSpecies = await getTranslations('AnimalSpecies');
  const tGender = await getTranslations('AnimalGender');
  const tPurpose = await getTranslations('AnimalPurpose');

  const animalsForSale = await getForSaleAnimals();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {animalsForSale.length > 0 ? (
          animalsForSale.map((animal) => (
            <Card key={animal.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-0">
                <div className="aspect-video relative">
                  {animal.images && animal.images.length > 0 ? (
                    <Image
                      src={animal.images[0]}
                      alt={`${animal.breed} ${animal.species}`}
                      fill
                      className="object-cover"
                      data-ai-hint={`${animal.breed} ${animal.species.toLowerCase()}`}
                    />
                  ) : (
                    <div className="bg-muted h-full flex items-center justify-center text-muted-foreground">
                      {t('noImage')}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl mb-2">{animal.breed}</CardTitle>
                  <Badge variant="outline">{animal.animalId}</Badge>
                </div>
                <div className="space-y-2">
                  <AnimalDetail label={tAnimalPage('tableHeaders.species')} value={tSpecies(animal.species.toLowerCase())} />
                  <AnimalDetail label={tAnimalPage('tableHeaders.gender')} value={tGender(animal.gender)} />
                  <AnimalDetail label={tAnimalPage('tableHeaders.purpose')} value={tPurpose(animal.purpose)} />
                  <Separator />
                  <AnimalDetail label={tAnimalPage('tableHeaders.weight')} value={animal.weight} />
                  <AnimalDetail label={tAnimalPage('tableHeaders.dob')} value={formatDisplayDate(animal.dob)} />
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full">{t('contactSeller')}</Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-16">
            No animals currently for sale.
          </div>
        )}
      </div>
    </div>
  );
}
