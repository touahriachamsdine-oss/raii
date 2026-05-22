'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/neon-client';
import { signup } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { algeriaLocations } from '@/lib/algeria-locations';
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('SignupPage');

  // Common fields
  const [role, setRole] = useState<'owner' | 'vet'>('owner');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Owner-specific fields
  const [familyName, setFamilyName] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');

  // Vet-specific fields
  const [farmName, setFarmName] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup({
        email,
        password,
        role,
        firstName,
        lastName,
        wilaya,
        commune,
        address,
        phoneNumber,
        familyName,
        idCardNumber,
        farmName
      });

      router.push('/dashboard');

      toast({
        title: t('toast.success.title'),
        description: t('toast.success.description'),
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('toast.error.title'),
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWilayaData = algeriaLocations.find((w) => w.name === wilaya);

  return (
    <div className="flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <Image
              src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png"
              width={80}
              height={80}
              alt="RAAI-AI Logo"
            />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('mission')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4 max-h-[75vh] overflow-y-auto px-6 py-4">
            {/* Role Selection */}
            <div className="grid gap-2">
              <Label htmlFor="role">{t('role.label')}</Label>
              <Select value={role} onValueChange={(value: 'owner' | 'vet') => setRole(value)} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('role.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('role.owner')}</SelectItem>
                  <SelectItem value="vet">{t('role.vet')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">{t('form.firstName.label')}</Label>
                <Input id="firstName" placeholder={t('form.firstName.placeholder')} required value={firstName} onChange={e => setFirstName(e.target.value)} disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">{t('form.lastName.label')}</Label>
                <Input id="lastName" placeholder={t('form.lastName.placeholder')} required value={lastName} onChange={e => setLastName(e.target.value)} disabled={isLoading} />
              </div>
            </div>

            {/* Role-Specific Fields */}
            {role === 'owner' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="familyName">{t('form.familyName.label')}</Label>
                  <Input id="familyName" placeholder={t('form.familyName.placeholder')} required value={familyName} onChange={e => setFamilyName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="idCardNumber">{t('form.idCardNumber.label')}</Label>
                  <Input id="idCardNumber" placeholder={t('form.idCardNumber.placeholder')} required value={idCardNumber} onChange={e => setIdCardNumber(e.target.value)} disabled={isLoading} />
                </div>
              </div>
            )}

            {role === 'vet' && (
              <div className="grid gap-2">
                <Label htmlFor="farmName">{t('form.farmName.label')}</Label>
                <Input id="farmName" placeholder={t('form.farmName.placeholder')} required value={farmName} onChange={e => setFarmName(e.target.value)} disabled={isLoading} />
              </div>
            )}

            <Separator />

            {/* Contact & Location */}
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">{t('form.phoneNumber.label')}</Label>
              <Input id="phoneNumber" type="tel" placeholder={t('form.phoneNumber.placeholder')} required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">{t('form.address.label')}</Label>
              <Input id="address" placeholder={t('form.address.placeholder')} required value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wilaya">{t('form.wilaya.label')}</Label>
                <Select value={wilaya} onValueChange={setWilaya} required>
                  <SelectTrigger id="wilaya"><SelectValue placeholder={t('form.wilaya.placeholder')} /></SelectTrigger>
                  <SelectContent>
                    {algeriaLocations.map((location) => (
                      <SelectItem key={location.name} value={location.name}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commune">{t('form.commune.label')}</Label>
                <Select value={commune} onValueChange={setCommune} disabled={!wilaya} required>
                  <SelectTrigger id="commune"><SelectValue placeholder={t('form.commune.placeholder')} /></SelectTrigger>
                  <SelectContent>
                    {selectedWilayaData?.baladiyas.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Account Credentials */}
            <div className="grid gap-2">
              <Label htmlFor="email">{t('form.email.label')}</Label>
              <Input id="email" type="email" placeholder={t('form.email.placeholder')} required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{t('form.password.label')}</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
          </CardContent>

          <Separator />

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t('creatingAccountButton') : t('createAccountButton')}
            </Button>

            <div className="text-center text-sm">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/login" className="underline">
                {t('loginLink')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
