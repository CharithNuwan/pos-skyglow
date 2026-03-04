import { SignJWT, jwtVerify } from 'jose';
import { query, queryOne, execute } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-this-secret-in-production-please'
);

export interface SessionUser {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'cashier';
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(JWT_SECRET);
  return token;
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  // Dynamically import cookies so this file stays usable in both server and edge contexts
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('pos_session')?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  const hierarchy: Record<string, number> = { cashier: 1, manager: 2, admin: 3 };
  return (hierarchy[userRole] ?? 0) >= (hierarchy[requiredRole] ?? 99);
}

export async function generateInvoiceNumber(): Promise<string> {
  const prefix = 'INV';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${date}${random}`;
}
