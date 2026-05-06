'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserProfile } from '@/lib/actions/profile';
import { searchVets, assignVet, unassignVet, getAssignedVets } from '@/lib/actions/vets';
import { useToast } from '@/hooks/use-toast';
import { Languages, Moon, Sun, Laptop, Search, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { algeriaLocations } from '@/lib/algeria-locations';
import { Separator } from '@/components/ui/separator';
import { UserProfile } from '@/lib/types';

const passwordFormSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required.'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

interface SettingsClientProps {
    initialProfile: UserProfile;
}

export function SettingsClient({ initialProfile }: SettingsClientProps) {
    const t = useTranslations('SettingsPage');
    const { setTheme, theme } = useTheme();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting, isDirty },
        reset,
        watch,
    } = useForm<UserProfile>({
        defaultValues: initialProfile
    });

    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
        reset: resetPassword,
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
    });

    const selectedWilaya = watch('wilaya');
    const selectedWilayaData = algeriaLocations.find((w) => w.name === selectedWilaya);

    // Vet Management State
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const ownerFarmId = initialProfile.farmIds?.[0];
    const [assignedVets, setAssignedVets] = React.useState<UserProfile[]>([]);
    const [isLoadingAssignedVets, setIsLoadingAssignedVets] = React.useState(false);

    const refreshAssignedVets = React.useCallback(async () => {
        if (ownerFarmId && initialProfile.role === 'owner') {
            setIsLoadingAssignedVets(true);
            try {
                const vets = await getAssignedVets(ownerFarmId);
                setAssignedVets(vets as UserProfile[]);
            } catch (e) {
                console.error("Failed to refresh vets", e);
            }
            setIsLoadingAssignedVets(false);
        }
    }, [ownerFarmId, initialProfile.role]);

    React.useEffect(() => {
        refreshAssignedVets();
    }, [refreshAssignedVets]);

    const getBasePath = () => {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0 && ['en', 'fr', 'ar'].includes(segments[0])) {
            segments.shift();
        }
        return `/${segments.join('/')}`;
    };

    const handleLocaleChange = (newLocale: string) => {
        const path = getBasePath();
        router.push(`/${newLocale}${path}`);
    };

    const onProfileSubmit = async (data: UserProfile) => {
        try {
            await updateUserProfile(initialProfile.uid, data);

            toast({
                title: t('profile.toast.success.title'),
                description: t('profile.toast.success.description'),
            });
            reset(data);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('profile.toast.error.title'),
                description: error.message || 'An unexpected error occurred.',
            });
        }
    };

    const onChangePasswordSubmit = async (data: PasswordFormValues) => {
        toast({
            title: "Feature coming soon",
            description: "Password changes are currently disabled during migration.",
        });
    };

    const handleVetSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await searchVets(searchQuery);
            setSearchResults(results as UserProfile[]);
        } catch (error) {
            console.error("Error searching vets:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAssignVet = async (vetId: string) => {
        if (!ownerFarmId) return;
        try {
            await assignVet(vetId, ownerFarmId);
            toast({
                title: t('manageVets.toast.assignSuccess.title'),
                description: t('manageVets.toast.assignSuccess.description'),
            });
            await refreshAssignedVets();
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: t('manageVets.toast.assignError.title'),
                description: e.message,
            });
        }
    };

    const handleRemoveVet = async (vetId: string) => {
        if (!ownerFarmId) return;
        try {
            await unassignVet(vetId, ownerFarmId);
            toast({
                title: t('manageVets.toast.removeSuccess.title'),
                description: t('manageVets.toast.removeSuccess.description'),
            });
            await refreshAssignedVets();
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: t('manageVets.toast.removeError.title'),
                description: e.message,
            });
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <form onSubmit={handleSubmit(onProfileSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('profile.title')}</CardTitle>
                        <CardDescription>{t('profile.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">{t('profile.form.firstName.label')}</Label>
                                <Input id="firstName" {...register('firstName')} placeholder={t('profile.form.firstName.placeholder')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">{t('profile.form.lastName.label')}</Label>
                                <Input id="lastName" {...register('lastName')} placeholder={t('profile.form.lastName.placeholder')} />
                            </div>
                            {initialProfile.role === 'owner' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="familyName">{t('profile.form.familyName.label')}</Label>
                                        <Input id="familyName" {...register('familyName')} placeholder={t('profile.form.familyName.placeholder')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="idCardNumber">{t('profile.form.idCardNumber.label')}</Label>
                                        <Input id="idCardNumber" {...register('idCardNumber')} placeholder={t('profile.form.idCardNumber.placeholder')} />
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">{t('profile.form.phoneNumber.label')}</Label>
                                <Input id="phoneNumber" type="tel" {...register('phoneNumber')} placeholder={t('profile.form.phoneNumber.placeholder')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('profile.form.email.label')}</Label>
                                <Input id="email" type="email" value={initialProfile.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">{t('profile.form.address.label')}</Label>
                                <Input id="address" {...register('address')} placeholder={t('profile.form.address.placeholder')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wilaya">{t('profile.form.wilaya.label')}</Label>
                                <Controller
                                    name="wilaya"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="wilaya"><SelectValue placeholder={t('profile.form.wilaya.placeholder')} /></SelectTrigger>
                                            <SelectContent>
                                                {algeriaLocations.map((location) => (
                                                    <SelectItem key={location.name} value={location.name}>
                                                        {location.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="commune">{t('profile.form.commune.label')}</Label>
                                <Controller
                                    name="commune"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedWilaya}>
                                            <SelectTrigger id="commune"><SelectValue placeholder={t('profile.form.commune.placeholder')} /></SelectTrigger>
                                            <SelectContent>
                                                {selectedWilayaData?.baladiyas.map((b) => (
                                                    <SelectItem key={b} value={b}>
                                                        {b}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting ? t('profile.form.savingButton') : t('profile.form.saveButton')}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <form onSubmit={handleSubmitPassword(onChangePasswordSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('profile.changePassword.title')}</CardTitle>
                        <CardDescription>{t('profile.changePassword.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="oldPassword">{t('profile.changePassword.form.oldPassword.label')}</Label>
                            <Input id="oldPassword" type="password" {...registerPassword('oldPassword')} />
                            {passwordErrors.oldPassword && <p className="text-sm font-medium text-destructive">{passwordErrors.oldPassword.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t('profile.changePassword.form.newPassword.label')}</Label>
                            <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                            {passwordErrors.newPassword && <p className="text-sm font-medium text-destructive">{passwordErrors.newPassword.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('profile.changePassword.form.confirmPassword.label')}</Label>
                            <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
                            {passwordErrors.confirmPassword && <p className="text-sm font-medium text-destructive">{passwordErrors.confirmPassword.message as string}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmittingPassword}>
                            {isSubmittingPassword ? t('profile.changePassword.form.savingButton') : t('profile.changePassword.form.saveButton')}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            {initialProfile.role === 'owner' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('manageVets.title')}</CardTitle>
                        <CardDescription>{t('manageVets.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">{t('manageVets.assignedTitle')}</h3>
                            {isLoadingAssignedVets ? (
                                <Skeleton className="h-10 w-full" />
                            ) : assignedVets && assignedVets.length > 0 ? (
                                <ul className="space-y-2">
                                    {assignedVets.map(vet => (
                                        <li key={vet.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                            <div>
                                                <p className="font-medium">{vet.displayName}</p>
                                                <p className="text-sm text-muted-foreground">{vet.email}</p>
                                            </div>
                                            <Button variant="destructive" size="sm" onClick={() => handleRemoveVet(vet.uid)}>{t('manageVets.removeButton')}</Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('manageVets.noAssignedVets')}</p>
                            )}
                        </div>

                        <Separator />

                        <div>
                            <h3 className="font-semibold text-lg mb-2">{t('manageVets.searchTitle')}</h3>
                            <div className="flex gap-2 mb-4">
                                <Input
                                    placeholder={t('manageVets.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVetSearch()}
                                />
                                <Button onClick={handleVetSearch} disabled={isSearching}>
                                    {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                                    <span className="ml-2 hidden sm:inline">{t('manageVets.searchButton')}</span>
                                </Button>
                            </div>

                            {isSearching ? (
                                <Skeleton className="h-10 w-full" />
                            ) : searchResults.length > 0 ? (
                                <ul className="space-y-2">
                                    {searchResults.filter(vet => !assignedVets?.some(assigned => assigned.id === vet.id)).map(vet => (
                                        <li key={vet.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                                            <div>
                                                <p className="font-medium">{vet.displayName}</p>
                                                <p className="text-sm text-muted-foreground">{vet.email}</p>
                                            </div>
                                            <Button variant="secondary" size="sm" onClick={() => handleAssignVet(vet.uid)}>{t('manageVets.assignButton')}</Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('manageVets.noSearchResults')}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t('appearance.title')}</CardTitle>
                    <CardDescription>{t('appearance.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('appearance.theme.label')}</Label>
                        <Select value={theme} onValueChange={(value) => setTheme(value)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('appearance.theme.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4" /> {t('appearance.theme.light')}</div></SelectItem>
                                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4" /> {t('appearance.theme.dark')}</div></SelectItem>
                                <SelectItem value="system"><div className="flex items-center gap-2"><Laptop className="h-4 w-4" /> {t('appearance.theme.system')}</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('language.title')}</CardTitle>
                    <CardDescription>{t('language.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>{t('language.label')}</Label>
                        <Select value={locale} onValueChange={handleLocaleChange}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('language.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">{t('language.en')}</SelectItem>
                                <SelectItem value="fr">{t('language.fr')}</SelectItem>
                                <SelectItem value="ar">{t('language.ar')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
