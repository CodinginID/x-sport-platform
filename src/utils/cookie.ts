const SESSION_COOKIE = 'xsport_session';

export function getSessionCookie(): string | null {
  const match = document.cookie.match(/(^|;\s*)xsport_session=([^;]+)/);
  return match ? match[2] : null;
}

export function setSessionCookie(value: string, days: number | null) {
  let cookie = `${SESSION_COOKIE}=${value}; path=/; SameSite=Strict`;
  if (days) {
    const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
    cookie += `; expires=${expires}`;
  }
  document.cookie = cookie;
}

export function deleteSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}
