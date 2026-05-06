'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  HeartPulse,
  Bell,
  Settings,
  List,
  Shield,
  Languages,
  Check,
  Moon,
  Sun,
  Laptop,
  Store,
  LogOut,
  Package,
  User as UserIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthProvider, useDoc, useMemoFirebase } from '@/lib/neon-client';
import { Skeleton } from '@/components/ui/skeleton';


const DesktopLayout = ({
  children,
  menuItems,
  isActive,
  t,
  user
}: {
  children: React.ReactNode;
  menuItems: { href: string; label: string; icon: React.ElementType }[];
  isActive: (path: string) => boolean;
  t: (key: string) => string;
  user: any;
}) => (
  <SidebarProvider>
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="group-data-[variant=floating]:bg-card group-data-[variant=floating]:border-transparent"
    >
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png" width={48} height={48} alt="RAII-AI Logo" />
          <span className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">{t('sidebar.title')}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')} className="justify-start" tooltip={t('sidebar.settings')}>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('sidebar.settings')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <main className="flex-1">
      <header className="flex items-center justify-between p-4 bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Link href="/dashboard" className="hidden peer-data-[state=collapsed]:flex items-center gap-2">
            <Image src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png" width={48} height={48} alt="RAII-AI Logo" />
            <span className="text-xl font-semibold">{t('sidebar.title')}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu t={t} user={user} />
        </div>
      </header>
      <div className="p-4 sm:p-6 lg:p-8">{children}</div>
    </main>
  </SidebarProvider>
);

const MobileLayout = ({
  children,
  menuItems,
  isActive,
  t,
  user
}: {
  children: React.ReactNode;
  menuItems: { href: string; label: string; icon: React.ElementType }[];
  isActive: (path: string) => boolean;
  t: (key: string) => string;
  user: any;
}) => {

  return (
    <div className="flex flex-col min-h-svh">
      <header className="flex items-center justify-between p-4 bg-card sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png" width={48} height={48} alt="RAII-AI Logo" />
          <span className="text-lg font-semibold">{t('sidebar.title')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu t={t} user={user} />
        </div>
      </header>
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-10 pb-safe">
        <div className="grid grid-flow-col auto-cols-fr h-16">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isActive(item.href)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isActive('/settings')
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>{t('sidebar.settings')}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};


export function MainLayout({ children, initialUser }: { children: React.ReactNode; initialUser: any }) {
  const t = useTranslations('MainLayout');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const user = initialUser;
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const publicPages = ['/login', '/signup'];
  const isPublicPage = publicPages.some(page => pathname.endsWith(page)) || pathname === `/${locale}`;

  const menuItems = [
    { href: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/animals', label: t('sidebar.animals'), icon: List },
    { href: '/inventory', label: t('sidebar.inventory') || 'Inventory', icon: Package },
    { href: '/symptom-checker', label: t('sidebar.symptomChecker'), icon: HeartPulse },
    { href: '/alerts', label: t('sidebar.alerts'), icon: Bell },
  ];

  if (isAdmin) {
    menuItems.push({ href: '/admin', label: t('sidebar.admin'), icon: Shield });
  }

  const getBasePath = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && ['en', 'fr', 'ar'].includes(segments[0])) {
      segments.shift();
    }
    const path = `/${segments.join('/')}`;
    if (path === `/${locale}`) return '/';
    return path;
  };

  const isActive = (href: string) => {
    const basePath = getBasePath();
    if (href === '/dashboard' && (basePath === '/dashboard' || basePath === `/${locale}/dashboard` || basePath === '/')) return true;
    if (href !== '/dashboard' && basePath.startsWith(href)) return true;
    return false;
  };

  if (!mounted) {
    return <div className="flex items-center justify-center h-screen bg-background">
      <Image src="https://i.ibb.co/8DKbCq3f/watermarked-1f0f096a-bb6e-4d0e-a490-68278d55363f-1-removebg-preview.png" width={120} height={120} alt="RAII-AI Logo" className="animate-pulse" />
    </div>;
  }

  if (isPublicPage && !user) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <AuthProvider user={user}>
        <MobileLayout menuItems={menuItems} isActive={isActive} t={t as (key: string) => string} user={user}>
          {children}
        </MobileLayout>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider user={user}>
      <DesktopLayout menuItems={menuItems} isActive={isActive} t={t as (key: string) => string} user={user}>
        {children}
      </DesktopLayout>
    </AuthProvider>
  );
}

const UserMenu = ({ t, user }: { t: (key: string) => string; user: any }) => {
  const router = useRouter();

  const handleLogout = async () => {
    // In a real app, call logout action here
    window.location.href = '/login';
  };

  if (!user) {
    return <Button asChild variant="outline"><Link href="/login">Login</Link></Button>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="w-full flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('sidebar.settings')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('userMenu.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
};

const LanguageToggle = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const getBasePath = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && ['en', 'fr', 'ar'].includes(segments[0])) {
      segments.shift();
    }
    const newPath = segments.join('/');
    return `/${newPath === locale ? '' : newPath}`;
  };

  const handleLocaleChange = (newLocale: string) => {
    const path = getBasePath();
    router.push(`/${newLocale}${path}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLocaleChange('en')}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange('fr')}>Français</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange('ar')}>العربية</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
