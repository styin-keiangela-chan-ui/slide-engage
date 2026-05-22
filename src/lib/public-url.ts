export const DEFAULT_PUBLIC_APP_URL = '';

export function normalizePublicUrl(value?: string | null) {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return '';
  }
}

export function isLocalUrl(value: string) {
  return /(^https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i.test(value);
}

export function getConfiguredPublicAppUrl() {
  const configured = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configured && !isLocalUrl(configured)) return configured;
  return '';
}

export function isProductionUrlConfigured() {
  const configured = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  return Boolean(configured && !isLocalUrl(configured));
}
