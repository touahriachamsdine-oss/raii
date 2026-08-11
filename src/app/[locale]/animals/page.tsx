
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2, FileText, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useDoc, useMemoFirebase, useUser } from '@/lib/neon-client';
import { getAnimals, addAnimal, updateAnimal, deleteAnimal } from '@/lib/actions/animals';
import { Animal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const emptyAnimal: Omit<Animal, 'id' | 'animalId' | 'farmId'> = {
  species: '',
  breed: '',
  dob: '',
  gender: 'Female',
  status: 'Active',
  purpose: 'Meat',
  lastPregnancy: '',
  weight: '',
  monthlyProduction: '',
  sickness: '',
  vaccinations: '',
  photoUrl: '',
  sellerName: '',
  farmName: '',
};

const formatDisplayDate = (dateString?: any) => {
  if (!dateString) return '-';
  try {
    const actualStr = typeof dateString === 'string' 
      ? dateString 
      : (dateString instanceof Date ? dateString.toISOString() : String(dateString));
      
    if (/^\d{4}-\d{2}$/.test(actualStr)) {
      return actualStr;
    }
    const date = parseISO(actualStr);
    if (isValid(date)) {
      return format(date, 'MMM d, yyyy');
    }
    return actualStr;
  } catch {
    return typeof dateString === 'string' ? dateString : '-';
  }
};

export default function AnimalsPage() {
  const t = useTranslations();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedAnimal, setSelectedAnimal] = React.useState<Animal | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { toast } = useToast();
  const { user } = useUser();
  const [animals, setAnimals] = React.useState<Animal[]>([]);
  const [isLoadingAnimals, setIsLoadingAnimals] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => (user ? { collection: 'users', id: user.uid } : null), [user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{ farmIds: string[] }>(userProfileRef);
  const farmId = userProfile?.farmIds?.[0];

  const refreshAnimals = React.useCallback(async () => {
    if (farmId) {
      setIsLoadingAnimals(true);
      const data = await getAnimals(farmId);
      setAnimals(data as Animal[]);
      setIsLoadingAnimals(false);
    }
  }, [farmId]);

  React.useEffect(() => {
    refreshAnimals();
  }, [refreshAnimals]);

  const [formData, setFormData] = React.useState<Partial<Animal>>({});

  const filteredAnimals = React.useMemo(() => {
    if (!animals) return [];
    const query = (searchQuery || '').toLowerCase();
    return animals.filter(animal =>
      (animal.animalId || '').toLowerCase().includes(query)
    );
  }, [animals, searchQuery]);

  const resetDialogState = () => {
    setIsEditing(false);
    setSelectedAnimal(null);
    setFormData(emptyAnimal);
    setImageFile(null);
    setUploadProgress(null);
  }

  const handleOpenAddDialog = () => {
    resetDialogState();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (animal: Animal) => {
    resetDialogState();
    setIsEditing(true);
    setSelectedAnimal(animal);
    setFormData({
      ...animal,
      lastPregnancy: animal.lastPregnancy || '',
      weight: animal.weight || '',
      monthlyProduction: animal.monthlyProduction || '',
      sickness: animal.sickness || '',
      vaccinations: animal.vaccinations || '',
      photoUrl: animal.photoUrl || '',
    });
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!user) return;
    if (!farmId) {
      toast({ variant: "destructive", title: "No farm found", description: "Your user profile does not seem to be associated with a farm." });
      return;
    }
    if (!formData) return;

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      let photoUrl = formData.photoUrl || '';

      const animalData = { ...formData, photoUrl };

      if (isEditing && selectedAnimal) {
        await updateAnimal(selectedAnimal.id, animalData);
      } else {
        await addAnimal(animalData, farmId);
      }

      await refreshAnimals();

      toast({
        title: isEditing ? "Animal updated" : "Animal added",
        description: `The animal record for ${isEditing ? formData.animalId : ''} has been saved.`,
      });

      resetDialogState();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to save animal:", error);
      toast({
        variant: "destructive",
        title: "Failed to save animal",
        description: error.message || "There was a problem saving the animal. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (animalId: string) => {
    if (!farmId) return;
    if (window.confirm('Are you sure you want to delete this animal?')) {
      await deleteAnimal(animalId);
      await refreshAnimals();
    }
  };

  const handleFormInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusVariant = (status: Animal['status']) => {
    switch (status) {
      case 'Active':
      case 'ForSale':
        return 'default';
      case 'Sold':
        return 'secondary';
      case 'Deceased':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('AnimalsPage.title')}</h1>
          <p className="text-muted-foreground">{t('AnimalsPage.description')}</p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          {t('AnimalsPage.addAnimalButton')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground" />
        <Input
          placeholder={t('AnimalsPage.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>


      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t('AnimalsPage.tableHeaders.photo')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.id')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.species')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.breed')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.dob')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.gender')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.status')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.purpose')}</TableHead>
              <TableHead>{t('AnimalsPage.tableHeaders.weight')}</TableHead>
              <TableHead className="text-right">{t('AnimalsPage.tableHeaders.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAnimals && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={10}><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            ))}
            {filteredAnimals.map((animal) => (
              <TableRow key={animal.id}>
                <TableCell>
                  {animal.photoUrl ? (
                    <Avatar>
                      <AvatarImage src={animal.photoUrl} alt={animal.breed} />
                      <AvatarFallback>{animal.breed.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : '-'}
                </TableCell>
                <TableCell className="font-medium">{animal.animalId}</TableCell>
                <TableCell>{t(`AnimalSpecies.${animal.species.toLowerCase()}`)}</TableCell>
                <TableCell>{animal.breed}</TableCell>
                <TableCell>{formatDisplayDate(animal.dob)}</TableCell>
                <TableCell>{t(`AnimalGender.${animal.gender}`)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(animal.status)}>{t(`AnimalStatus.${animal.status}`)}</Badge>
                </TableCell>
                <TableCell>{t(`AnimalPurpose.${animal.purpose}`)}</TableCell>
                <TableCell>{animal.weight || '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleOpenEditDialog(animal)}><Edit className="mr-2" />{t('AnimalsPage.editAction')}</DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/animal/${animal.id}`} className="w-full flex items-center">
                          <FileText className="mr-2" />
                          <span>{t('AnimalsPage.consultationAction')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(animal.id)}><Trash2 className="mr-2" />{t('AnimalsPage.deleteAction')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!isLoadingAnimals && filteredAnimals.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No animals found. Get started by adding one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? t('AnimalsPage.editDialog.title') : t('AnimalsPage.addDialog.title')}</DialogTitle>
            <DialogDescription>
              {isEditing ? t('AnimalsPage.editDialog.description') : t('AnimalsPage.addDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="animal-id">{t('AnimalsPage.form.id.label')}</Label>
                <Input id="animal-id" value={formData.animalId || ''} onChange={(e) => handleFormInputChange('animalId', e.target.value)} placeholder={t('AnimalsPage.form.id.placeholder')} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="animal-id">{t('AnimalsPage.form.id.label')}</Label>
                <Input id="animal-id" value="Generated automatically" disabled />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="species">{t('AnimalsPage.form.species.label')}</Label>
              <Select value={formData.species} onValueChange={(value) => handleFormInputChange('species', value)} >
                <SelectTrigger>
                  <SelectValue placeholder={t('AnimalsPage.form.species.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bovine">{t('AnimalSpecies.bovine')}</SelectItem>
                  <SelectItem value="ovine">{t('AnimalSpecies.ovine')}</SelectItem>
                  <SelectItem value="caprine">{t('AnimalSpecies.caprine')}</SelectItem>
                  <SelectItem value="camelid">{t('AnimalSpecies.camelid')}</SelectItem>
                  <SelectItem value="other">{t('AnimalSpecies.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">{t('AnimalsPage.form.breed.label')}</Label>
              <Input id="breed" placeholder={t('AnimalsPage.form.breed.placeholder')} value={formData.breed || ''} onChange={(e) => handleFormInputChange('breed', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">{t('AnimalsPage.form.dob')}</Label>
              <Input id="dob" type="date" value={formData.dob || ''} onChange={(e) => handleFormInputChange('dob', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">{t('AnimalsPage.form.gender.label')}</Label>
              <Select value={formData.gender} onValueChange={(value: 'Male' | 'Female') => handleFormInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('AnimalsPage.form.gender.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">{t('AnimalGender.Female')}</SelectItem>
                  <SelectItem value="Male">{t('AnimalGender.Male')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">{t('AnimalsPage.form.purpose.label')}</Label>
              <Select value={formData.purpose} onValueChange={(value: 'Meat' | 'Milk' | 'Other') => handleFormInputChange('purpose', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('AnimalsPage.form.purpose.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meat">{t('AnimalPurpose.Meat')}</SelectItem>
                  <SelectItem value="Milk">{t('AnimalPurpose.Milk')}</SelectItem>
                  <SelectItem value="Other">{t('AnimalPurpose.Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('AnimalsPage.tableHeaders.status')}</Label>
              <Select value={formData.status} onValueChange={(value: 'Active' | 'Sold' | 'Deceased' | 'ForSale') => handleFormInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t('AnimalStatus.Active')}</SelectItem>
                  <SelectItem value="ForSale">{t('AnimalStatus.ForSale')}</SelectItem>
                  <SelectItem value="Sold">{t('AnimalStatus.Sold')}</SelectItem>
                  <SelectItem value="Deceased">{t('AnimalStatus.Deceased')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-pregnancy">{t('AnimalsPage.form.lastPregnancy')}</Label>
              <Input id="last-pregnancy" type="date" value={formData.lastPregnancy || ''} onChange={(e) => handleFormInputChange('lastPregnancy', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">{t('AnimalsPage.form.weight.label')}</Label>
              <Input id="weight" placeholder={t('AnimalsPage.form.weight.placeholder')} value={formData.weight || ''} onChange={(e) => handleFormInputChange('weight', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-production">{t('AnimalsPage.form.monthlyProduction.label')}</Label>
              <Input id="monthly-production" placeholder={t('AnimalsPage.form.monthlyProduction.placeholder')} value={formData.monthlyProduction || ''} onChange={(e) => handleFormInputChange('monthlyProduction', e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="sickness">{t('AnimalsPage.form.sickness.label')}</Label>
              <Input id="sickness" placeholder={t('AnimalsPage.form.sickness.placeholder')} value={formData.sickness || ''} onChange={(e) => handleFormInputChange('sickness', e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="vaccinations">{t('AnimalsPage.form.vaccinations.label')}</Label>
              <Textarea id="vaccinations" placeholder={t('AnimalsPage.form.vaccinations.placeholder')} value={formData.vaccinations || ''} onChange={(e) => handleFormInputChange('vaccinations', e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="photo">{t('AnimalsPage.form.images.label')}</Label>
              <Input id="photo" type="file" accept="image/*" onChange={(e) => e.target.files && setImageFile(e.target.files[0])} />
              {uploadProgress !== null && (
                <Progress value={uploadProgress} className="w-full mt-2" />
              )}
              {formData.photoUrl && !imageFile && (
                <div className="mt-2">
                  <Image src={formData.photoUrl} alt="Animal" width={100} height={100} className="rounded-md object-cover" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">{t('AnimalsPage.form.images.description')}</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t('AnimalsPage.cancelButton')}
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleFormSubmit} disabled={isSubmitting || isProfileLoading}>
              {(isSubmitting || isProfileLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t('AnimalsPage.editDialog.saveButton') : t('AnimalsPage.addDialog.addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
