import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const intlMiddleware = createMiddleware({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if it's a public page
  const publicPages = ['/login', '/signup'];
  // Check if pathname ends with any of the public pages or IS exactly a locale root
  const isPublicPage = publicPages.some(page => pathname.endsWith(page)) ||
    ['/en', '/fr', '/ar', '/en/', '/fr/', '/ar/', '/'].includes(pathname);

  // 2. Check for session
  const session = req.cookies.get('session')?.value;
  const payload = session ? await decrypt(session) : null;

  // 3. Redirect to login if unauthenticated and trying to access private page
  // Exclude static assets and API routes (Genkit might have its own auth)
  if (!payload && !isPublicPage && !pathname.includes('/_next') && !pathname.includes('/api')) {
    // Preserve the current locale when redirecting to login
    const localeMatch = pathname.match(/^\/(en|fr|ar)(\/|$)/);
    const locale = localeMatch ? localeMatch[1] : 'en';
    const loginUrl = new URL(locale === 'en' ? '/login' : `/${locale}/login`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Redirect to dashboard if authenticated and trying to access login/signup
  if (payload && (pathname.endsWith('/login') || pathname.endsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
