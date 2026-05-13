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

export function hashPassword(password: string): string {
  return btoa(password);
}

export function verifyPassword(password: string, hash: string): boolean {
  return atob(hash) === password;
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
