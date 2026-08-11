'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase } from '@/lib/neon-client';
import { useTranslations } from 'next-intl';
import { format, parseISO, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, History, TrendingUp, Heart, Calendar, Syringe, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { 
  addHealthLog, 
  addProductionLog, 
  addBreedingRecord,
  deleteHealthLog,
  deleteProductionLog,
  deleteBreedingRecord,
  deleteVaccinationSchedule,
  updateVaccinationStatus
} from '@/lib/actions/farm-os';
import { getAnimalDetails } from '@/lib/actions/animal-details';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

type Animal = {
  id: string;
  animalId: string;
  species: string;
  breed: string;
  dob: string;
  gender: 'Male' | 'Female';
  status: 'Active' | 'Sold' | 'Deceased' | 'ForSale';
  purpose: 'Meat' | 'Milk' | 'Other';
  lastPregnancy?: string;
  weight?: string;
  photoUrl?: string;
  healthLogs: any[];
  productionLogs: any[];
  breedingRecords: any[];
  vaccinations: any[];
};

const formatDisplayDate = (dateString?: string | Date) => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isValid(date)) {
      return format(date, 'PP');
    }
    return String(dateString);
  } catch {
    return String(dateString);
  }
};

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || '-'}</p>
  </div>
);

export default function AnimalProfilePage() {
  const params = useParams();
  const animalId = params.animalId as string;

  const t = useTranslations();
  const tAnimalStatus = useTranslations('AnimalStatus');
  const tAnimalSpecies = useTranslations('AnimalSpecies');
  const tAnimalGender = useTranslations('AnimalGender');
  const tAnimalPurpose = useTranslations('AnimalPurpose');

  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState('health');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<'health' | 'production' | 'breeding'>('health');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [animal, setAnimal] = React.useState<Animal | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<any>({});

  const productionChartData = React.useMemo(() => {
    if (!animal?.productionLogs) return [];
    return [...animal.productionLogs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(log => ({
        date: format(new Date(log.date), 'MMM d'),
        value: log.value,
        metric: log.metricType
      }));
  }, [animal?.productionLogs]);

  const upcomingVaccination = React.useMemo(() => {
    if (!animal?.vaccinations) return null;
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return animal.vaccinations.find(v => {
      const date = new Date(v.plannedDate);
      return v.status === 'planned' && date >= now && date <= nextWeek;
    });
  }, [animal?.vaccinations]);

  const refreshData = React.useCallback(async () => {
    if (!animalId) return;
    setIsLoading(true);
    try {
      const data = await getAnimalDetails(animalId);
      if (data) {
        setAnimal(data as any as Animal);
      } else {
        setError("Animal not found.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load animal details.");
    } finally {
      setIsLoading(false);
    }
  }, [animalId]);

  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const handleDelete = async (type: 'health' | 'production' | 'breeding' | 'vaccination', id: string) => {
    setIsDeleting(id);
    try {
      let result;
      switch (type) {
        case 'health':
          result = await deleteHealthLog(id);
          break;
        case 'production':
          result = await deleteProductionLog(id);
          break;
        case 'breeding':
          result = await deleteBreedingRecord(id);
          break;
        case 'vaccination':
          result = await deleteVaccinationSchedule(id);
          break;
      }

      if (result?.success) {
        toast({
          title: "Record deleted",
          description: "The record has been successfully removed.",
        });
        refreshData();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the record. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateVaccinationStatus = async (id: string, status: 'completed' | 'missed') => {
    setIsSubmitting(true);
    try {
      const result = await updateVaccinationStatus(id, status);
      if (result.success) {
        toast({
          title: "Status updated",
          description: `Vaccination marked as ${status}.`,
        });
        refreshData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!animal || !user) return;
    setIsSubmitting(true);

    try {
      if (dialogType === 'health') {
        await addHealthLog({
          animalId: animal.id,
          eventType: formData.eventType,
          description: formData.description,
          date: formData.date ? new Date(formData.date) : new Date(),
          medication: formData.medication,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          notes: formData.notes
        });
      } else if (dialogType === 'production') {
        await addProductionLog({
          animalId: animal.id,
          date: formData.date ? new Date(formData.date) : new Date(),
          metricType: formData.metricType,
          value: parseFloat(formData.value),
          unit: formData.unit
        });
      } else if (dialogType === 'breeding') {
        await addBreedingRecord({
          animalId: animal.id,
          eventType: formData.eventType,
          date: formData.date ? new Date(formData.date) : new Date(),
          result: formData.result,
          expectedDueDate: formData.expectedDueDate ? new Date(formData.expectedDueDate) : undefined
        });
      }

      toast({
        title: "Success",
        description: "Log added successfully",
      });

      setIsDialogOpen(false);
      setFormData({});
      await refreshData();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: e.message || "Failed to add log",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !animal) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Failed to load animal."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={animal.photoUrl} alt={animal.animalId} />
            <AvatarFallback className="text-2xl">{animal.animalId?.charAt(0) || 'A'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{animal.animalId}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{tAnimalSpecies(animal.species.toLowerCase())}</Badge>
              <Badge variant={animal.status === 'Active' ? 'default' : 'secondary'}>
                {tAnimalStatus(animal.status)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => { setDialogType('health'); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Health Log
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('AnimalProfilePage.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label={t('AnimalProfilePage.breed')} value={animal.breed} />
            <DetailItem label={t('AnimalProfilePage.gender')} value={tAnimalGender(animal.gender)} />
            <DetailItem label={t('AnimalProfilePage.dob')} value={formatDisplayDate(animal.dob)} />
            <DetailItem label={t('AnimalProfilePage.purpose')} value={tAnimalPurpose(animal.purpose)} />
            <DetailItem label={t('AnimalProfilePage.weight')} value={animal.weight ? `${animal.weight} kg` : '-'} />
            <DetailItem label={t('AnimalProfilePage.lastPregnancy')} value={formatDisplayDate(animal.lastPregnancy)} />
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {upcomingVaccination && (
            <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
              <AlertTriangle className="h-4 w-4 stroke-orange-800" />
              <AlertTitle>Upcoming Vaccination</AlertTitle>
              <AlertDescription>
                {upcomingVaccination.vaccineName} is scheduled for {formatDisplayDate(upcomingVaccination.plannedDate)}.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="health" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="health">
                <History className="mr-2 h-4 w-4" />
                Health
              </TabsTrigger>
              <TabsTrigger value="production">
                <TrendingUp className="mr-2 h-4 w-4" />
                Production
              </TabsTrigger>
              <TabsTrigger value="breeding">
                <Heart className="mr-2 h-4 w-4" />
                Breeding
              </TabsTrigger>
              <TabsTrigger value="vaccinations">
                <Syringe className="mr-2 h-4 w-4" />
                Vaccines
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Medical Events</CardDescription>
                    <CardTitle className="text-2xl">{animal.healthLogs?.length || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Medical Cost</CardDescription>
                    <CardTitle className="text-2xl text-red-500">
                      {animal.healthLogs?.reduce((acc, curr) => acc + (curr.cost || 0), 0).toLocaleString()} DA
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Last Checkup</CardDescription>
                    <CardTitle className="text-2xl">
                      {animal.healthLogs?.length > 0 ? formatDisplayDate(animal.healthLogs[0].date) : '-'}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Health History</CardTitle>
                    <CardDescription>Comprehensive medical and treatment logs</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDialogType('health'); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Medication</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animal.healthLogs?.length > 0 ? (
                        animal.healthLogs.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{formatDisplayDate(l.date)}</TableCell>
                            <TableCell><Badge variant="outline">{l.eventType}</Badge></TableCell>
                            <TableCell>{l.medication || '-'}</TableCell>
                            <TableCell>{l.cost ? `${l.cost} DA` : '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{l.notes}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete('health', l.id)}
                                disabled={isDeleting === l.id}
                              >
                                {isDeleting === l.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No health logs recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vaccination Schedule</CardTitle>
                  <CardDescription>Upcoming and past vaccinations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vaccine</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animal.vaccinations?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No vaccinations scheduled.
                          </TableCell>
                        </TableRow>
                      ) : (
                        animal.vaccinations?.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.vaccineName}</TableCell>
                            <TableCell>{formatDisplayDate(v.plannedDate)}</TableCell>
                            <TableCell>
                              <Badge variant={v.status === 'completed' ? 'default' : v.status === 'missed' ? 'destructive' : 'outline'}>
                                {v.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete('vaccination', v.id)}
                                disabled={isDeleting === v.id}
                              >
                                {isDeleting === v.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="production" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Yield</CardDescription>
                    <CardTitle className="text-2xl">
                      {animal.productionLogs?.length > 0 
                        ? (animal.productionLogs.reduce((acc, curr) => acc + curr.value, 0) / animal.productionLogs.length).toFixed(1)
                        : '0'} L
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Logs</CardDescription>
                    <CardTitle className="text-2xl">{animal.productionLogs?.length || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Last Metric</CardDescription>
                    <CardTitle className="text-2xl">
                      {animal.productionLogs?.length > 0 
                        ? `${animal.productionLogs[0].value} ${animal.productionLogs[0].unit}`
                        : '-'}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Production Trend</CardTitle>
                  <CardDescription>Visualizing performance over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productionChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name="Yield" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Detailed Logs</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDialogType('production'); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animal.productionLogs?.length > 0 ? (
                        animal.productionLogs.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{formatDisplayDate(l.date)}</TableCell>
                            <TableCell>{l.metricType}</TableCell>
                            <TableCell className="font-bold">{l.value} {l.unit}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete('production', l.id)}
                                disabled={isDeleting === l.id}
                              >
                                {isDeleting === l.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                            No production metrics recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breeding" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Breeding Records</CardTitle>
                    <CardDescription>Insemination, pregnancy, and birth tracking</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDialogType('breeding'); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Expected Due</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animal.breedingRecords?.length > 0 ? (
                        animal.breedingRecords.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{formatDisplayDate(r.date)}</TableCell>
                            <TableCell><Badge>{r.eventType}</Badge></TableCell>
                            <TableCell>{r.result || '-'}</TableCell>
                            <TableCell>{formatDisplayDate(r.expectedDueDate)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete('breeding', r.id)}
                                disabled={isDeleting === r.id}
                              >
                                {isDeleting === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            No breeding records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vaccinations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vaccination Schedule</CardTitle>
                  <CardDescription>Planned and completed vaccinations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Planned Date</TableHead>
                        <TableHead>Vaccine</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {animal.vaccinations?.length > 0 ? (
                        animal.vaccinations.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{formatDisplayDate(v.plannedDate)}</TableCell>
                            <TableCell className="font-medium">{v.vaccineName}</TableCell>
                            <TableCell>
                              <Badge variant={v.status === 'completed' ? 'default' : v.status === 'missed' ? 'destructive' : 'outline'}>
                                {v.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {v.status === 'planned' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => handleUpdateVaccinationStatus(v.id, 'completed')}
                                >
                                  Complete
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDelete('vaccination', v.id)}
                                disabled={isDeleting === v.id}
                              >
                                {isDeleting === v.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                            No vaccinations scheduled
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Health Cost Analysis</CardTitle>
                    <CardDescription>Monthly medical expenditure breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={
                        animal.healthLogs?.reduce((acc: any[], curr: any) => {
                          const date = toDate(curr.date);
                          const month = date ? format(date, 'MMM') : 'Unknown';
                          const existing = acc.find(a => a.month === month);
                          if (existing) existing.cost += curr.cost || 0;
                          else acc.push({ month, cost: curr.cost || 0 });
                          return acc;
                        }, []).reverse()
                      }>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Performance Indicators</CardTitle>
                    <CardDescription>Advanced biological and operational metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Production Stability</span>
                      <span className="font-bold text-green-600">
                        {animal.productionLogs?.length > 1 
                          ? 'High' 
                          : 'Insufficient Data'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Breeding Intervals</span>
                      <span className="font-bold">
                        {animal.breedingRecords?.length > 1 
                          ? `${Math.floor((new Date(animal.breedingRecords[0].date).getTime() - new Date(animal.breedingRecords[1].date).getTime()) / (1000 * 60 * 60 * 24))} Days`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Medication Frequency</span>
                      <span className="font-bold">
                        {animal.healthLogs?.filter(l => l.eventType === 'Treatment').length || 0} Treatments
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Vaccination Adherence</span>
                      <span className="font-bold text-blue-600">
                        {animal.vaccinations?.length > 0 
                          ? `${Math.round((animal.vaccinations.filter(v => v.status === 'completed').length / animal.vaccinations.length) * 100)}%`
                          : '100%'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'health' ? 'Add Health Log' : dialogType === 'production' ? 'Add Production Metric' : 'Add Breeding Record'}
            </DialogTitle>
            <DialogDescription>
              Enter details to track your farm operations.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
            
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" onChange={(e) => handleInputChange('date', e.target.value)} required />
            </div>

            {dialogType === 'health' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select onValueChange={(v) => handleInputChange('eventType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checkup">Checkup</SelectItem>
                      <SelectItem value="Treatment">Treatment</SelectItem>
                      <SelectItem value="Vaccination">Vaccination</SelectItem>
                      <SelectItem value="Injury">Injury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="medication">Medication</Label>
                  <Input id="medication" onChange={(e) => handleInputChange('medication', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Cost (DA)</Label>
                  <Input id="cost" type="number" onChange={(e) => handleInputChange('cost', e.target.value)} />
                </div>
              </>
            )}

            {dialogType === 'production' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="metricType">Metric Type</Label>
                  <Select onValueChange={(v) => handleInputChange('metricType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Milk Yield">Milk Yield</SelectItem>
                      <SelectItem value="Weight">Weight</SelectItem>
                      <SelectItem value="Fiber">Fiber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="value">Value</Label>
                    <Input id="value" type="number" step="0.1" onChange={(e) => handleInputChange('value', e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" placeholder="L, kg, etc." onChange={(e) => handleInputChange('unit', e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {dialogType === 'breeding' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select onValueChange={(v) => handleInputChange('eventType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Insemination">Insemination</SelectItem>
                      <SelectItem value="Pregnancy Test">Pregnancy Test</SelectItem>
                      <SelectItem value="Birth">Birth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="result">Result / Status</Label>
                  <Input id="result" placeholder="Success, Positive, etc." onChange={(e) => handleInputChange('result', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDueDate">Expected Due Date</Label>
                  <Input id="expectedDueDate" type="date" onChange={(e) => handleInputChange('expectedDueDate', e.target.value)} />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" onChange={(e) => handleInputChange('notes', e.target.value)} />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('AnimalProfilePage.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
