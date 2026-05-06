import { MainLayout } from '@/components/main-layout';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { getCurrentUser } from '@/lib/actions/auth';


export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const user = await getCurrentUser();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MainLayout initialUser={user}>
          {children}
        </MainLayout>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

// Since we're using a dynamic layout based on auth state, 
// we need to fetch messages at this level.
export function generateStaticParams() {
  return ['en', 'fr', 'ar'].map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: {
      default: t('title.default'),
      template: t('title.template'),
    },
    description: t('description'),
  };
}
