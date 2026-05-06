import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const { locale } = await params;
  // This locale is not used, but it's required by the function signature.
  // The actual locale for metadata is handled by the middleware.
  // We'll use a default to prevent errors.
  const t = await getTranslations({locale: locale || 'en', namespace: 'Metadata'});
 
  return {
    title: {
      default: t('title.default'),
      template: t('title.template'),
    },
    description: t('description'),
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    // The lang and dir attributes are managed by the `next-intl` middleware
    // based on the locale in the URL.
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-body antialiased")}>
          {children}
        <Toaster />
      </body>
    </html>
  );
}
