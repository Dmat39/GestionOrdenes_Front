'use client';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getRol(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rol');
}

export function setAuth(token: string, rol: string) {
  localStorage.setItem('token', token);
  localStorage.setItem('rol', rol);
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('rol');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
