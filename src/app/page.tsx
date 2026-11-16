import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
