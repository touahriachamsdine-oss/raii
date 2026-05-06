import * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getUserProfile } from '@/lib/actions/profile';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const userProfile = await getUserProfile(user.uid);

  if (!userProfile) {
    // This shouldn't happen for an authenticated user, but handle gracefully
    return <div>Error loading profile. Please log in again.</div>;
  }

  return <SettingsClient initialProfile={userProfile} />;
}
