export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const MIN_PASSWORD_LENGTH = 6;

export function cleanName(val: string): string {
  return val.replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
}

export function cleanPhoneNumber(val: string): string {
  return val.replace(/\D/g, '').slice(0, 10);
}

export function formatPhoneNumber(val: string): string {
  const cleaned = cleanPhoneNumber(val);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  if (cleaned.length <= 8)
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
}

export function cleanAddress(val: string): string {
  return val.replace(/[^\s#,\-./0-9A-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
}

export function isAdult(birthDate: string): boolean {
  if (!DATE_REGEX.test(birthDate)) return false;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 18;
}
