import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(token);

  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
