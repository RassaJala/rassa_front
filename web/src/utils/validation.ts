export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const NAME_REGEX = /^[\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NOMBRE = 100;

export function cleanName(val: string): string {
  return val.replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
}

export function cleanPhoneNumber(val: string): string {
  return val.replace(/[\s()+-]+/g, '');
}

export function cleanAddress(val: string): string {
  return val;
}

export function isAdult(birthDate: string): boolean {
  if (!DATE_REGEX.test(birthDate)) return false;
  const parts = birthDate.split('-');
  const year = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10) - 1;
  const day = parseInt(parts[2] || '0', 10);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 18;
}
