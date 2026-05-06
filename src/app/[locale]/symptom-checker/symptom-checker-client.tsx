'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getSymptomTriage } from './actions';
import type { SymptomTriageOutput } from '@/ai/flows/symptom-triage';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, AlertTriangle, Loader2, HeartPulse } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMessages, useTranslations } from 'next-intl';

const myAnimalFormSchema = z.object({
  animalId: z.string().min(1, 'Please select an animal.'),
  symptoms: z.string().min(3, 'Please describe at least one symptom.'),
});

const newTriageFormSchema = z.object({
  species: z.string().min(1, 'Please select a species.'),
  symptoms: z.string().min(3, 'Please describe at least one symptom.'),
});

type MyAnimalFormValues = z.infer<typeof myAnimalFormSchema>;
type NewTriageFormValues = z.infer<typeof newTriageFormSchema>;

type Animal = {
  id: string;
  species: string;
  breed: string;
};

export function SymptomCheckerClient({ initialAnimals }: { initialAnimals: Animal[] }) {
  const t = useTranslations('SymptomCheckerClient');
  const tAnimalSpecies = useTranslations('AnimalSpecies');
  const messages = useMessages();
  const species = messages.AnimalSpecies as Record<string, string>;

  const [result, setResult] = useState<SymptomTriageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const animals = initialAnimals;

  const myAnimalForm = useForm<MyAnimalFormValues>({
    resolver: zodResolver(myAnimalFormSchema),
    defaultValues: {
      animalId: '',
      symptoms: '',
    },
  });

  const newTriageForm = useForm<NewTriageFormValues>({
    resolver: zodResolver(newTriageFormSchema),
    defaultValues: {
      species: '',
      symptoms: '',
    },
  });

  const selectedAnimalId = myAnimalForm.watch('animalId');
  const selectedAnimal = animals?.find(a => a.id === selectedAnimalId);

  async function handleTriage(species: string, symptoms: string) {
    setIsLoading(true);
    setResult(null);

    const symptomsArray = symptoms
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (symptomsArray.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Symptoms',
        description: 'Please enter valid symptoms, separated by commas or new lines.',
      });
      setIsLoading(false);
      return;
    }

    const triageResult = await getSymptomTriage({
      species: species,
      symptoms: symptomsArray,
    });

    if (triageResult.ok) {
      setResult(triageResult.data);
    } else {
      console.error(triageResult.error);
      toast({
        variant: 'destructive',
        title: t('toast.error.title'),
        description: triageResult.error || t('toast.error.description'),
      });
    }

    setIsLoading(false);
  }

  function onMyAnimalSubmit(values: MyAnimalFormValues) {
    if (!selectedAnimal) {
      toast({
        variant: 'destructive',
        title: "No animal selected",
        description: "Please select an animal before analyzing symptoms.",
      });
      return;
    }
    handleTriage(selectedAnimal.species, values.symptoms);
  }

  function onNewTriageSubmit(values: NewTriageFormValues) {
    handleTriage(values.species, values.symptoms);
  }


  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-animal">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-animal">{t('myAnimalTab.title')}</TabsTrigger>
              <TabsTrigger value="new-triage">{t('newTriageTab.title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="my-animal" className="pt-4">
              <Form {...myAnimalForm}>
                <form onSubmit={myAnimalForm.handleSubmit(onMyAnimalSubmit)} className="space-y-6">
                  <FormField
                    control={myAnimalForm.control}
                    name="animalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('myAnimalTab.form.animal.label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('myAnimalTab.form.animal.placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {animals?.map(animal => (
                              <SelectItem key={animal.id} value={animal.id}>
                                {animal.id} - {tAnimalSpecies(animal.species.toLowerCase() as any) || animal.species} ({animal.breed})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={myAnimalForm.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shared.form.symptoms.label')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('shared.form.symptoms.placeholder')}
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('shared.form.symptoms.description')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading || !selectedAnimalId} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('shared.submitButton')}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="new-triage" className="pt-4">
              <Form {...newTriageForm}>
                <form onSubmit={newTriageForm.handleSubmit(onNewTriageSubmit)} className="space-y-6">
                  <FormField
                    control={newTriageForm.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('newTriageTab.form.species.label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('newTriageTab.form.species.placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.keys(species).map((s) => (
                              <SelectItem key={s} value={s}>{tAnimalSpecies(s as any)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newTriageForm.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shared.form.symptoms.label')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('shared.form.symptoms.placeholder')}
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('shared.form.symptoms.description')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('shared.submitButton')}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('loadingState.title')}
              </CardTitle>
              <CardDescription>
                {t('loadingState.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-20 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{t('resultCard.title')}</CardTitle>
                  <CardDescription>{t('resultCard.description')}</CardDescription>
                </div>
                <Badge variant={getUrgencyBadgeVariant(result.urgency)} className="text-sm">
                  {result.urgency} {t('resultCard.urgency')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{t('resultCard.likelyCauses.title')}</h3>
                {result.likelyCauses.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {result.likelyCauses.map((cause, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium text-base">{cause.name}</span>
                            <Badge variant="secondary">
                              {Math.round(cause.confidence * 100)}% {t('resultCard.likelyCauses.confidence')}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pt-2">
                          {cause.why}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-muted-foreground">{t('resultCard.likelyCauses.none')}</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  {t('resultCard.recommendedActions.title')}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground bg-secondary/30 p-4 rounded-md">
                  {result.recommendedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('resultCard.disclaimer.title')}</AlertTitle>
                <AlertDescription>
                  {t('resultCard.disclaimer.description')}
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        )}

        {!isLoading && !result && (
          <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed min-h-[400px]">
            <CardHeader>
              <CardTitle>{t('waitingState.title')}</CardTitle>
              <CardDescription>
                {t('waitingState.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeartPulse className="h-16 w-16 text-muted-foreground/50" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

