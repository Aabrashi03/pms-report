const companyDomain = '@selangorproperties.com.my';

export function companyResetEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || !email.endsWith(companyDomain)) return null;
  const localPart = email.slice(0, -companyDomain.length);
  return localPart && !localPart.includes('@') ? email : null;
}
