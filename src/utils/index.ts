import { format, isToday as isTodayFn, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale/id";

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatCurrency(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy", { locale: localeId });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: localeId });
}

export function isToday(date: string | Date): boolean {
  return isTodayFn(new Date(date));
}

export function getStartOfDay(date?: Date): Date {
  return startOfDay(date ?? new Date());
}

export function getEndOfDay(date?: Date): Date {
  return endOfDay(date ?? new Date());
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return arrayBufferToHex(salt.buffer) + ':' + arrayBufferToHex(bits);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // PBKDF2 format: "saltHex:hashHex"
  if (stored.includes(':')) {
    const [saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(hexToArrayBuffer(saltHex));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    return arrayBufferToHex(bits) === hashHex;
  }
  // Legacy btoa format fallback
  try { return btoa(password) === stored; } catch { return false; }
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
