'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const t = useTranslations('LandingPage');
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-background animated-gradient">
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Languages className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Change language</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleLocaleChange('en')}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange('fr')}>Français</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange('ar')}>العربية</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <div className="flex flex-col items-center text-center p-8 z-10">
        <div className="animate-float">
          <Image
            src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png"
            width={320}
            height={320}
            alt="RAII-AI Logo"
            priority
          />
        </div>
        <h1 className="mt-8 text-4xl md:text-6xl font-bold tracking-tight animate-fade-in-up [animation-delay:200ms] animated-text-gradient">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground animate-fade-in-up [animation-delay:400ms]">
          {t('subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up [animation-delay:600ms]">
          <Button asChild size="lg">
            <Link href="/signup">{t('getStarted')}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login">{t('signIn')}</Link>
          </Button>
        </div>
      </div>
      <style jsx>{`
        .animate-fade-in-up {
          animation: fade-in-up 0.8s both;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}
