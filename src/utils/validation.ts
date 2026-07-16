export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MIN_PASSWORD_LENGTH = 6;

export function cleanName(val: string): string {
  return val.replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
}

export function cleanPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (val.trim().startsWith('+')) {
    return digits.slice(0, 12);
  }
  return digits.slice(0, 10);
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

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'Por favor, completa todos los campos obligatorios.';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Ingresa un correo electrónico válido.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Por favor, completa todos los campos obligatorios.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) {
    return 'Por favor, completa todos los campos obligatorios.';
  }
  if (cleaned.length !== 10 && cleaned.length !== 12) {
    return 'El teléfono debe tener exactamente 10 dígitos.';
  }
  return null;
}

export function validateBirthdate(dateStr: string, customMsg?: string): string | null {
  if (!dateStr.trim()) {
    return 'Por favor, completa todos los campos obligatorios.';
  }
  if (!DATE_REGEX.test(dateStr)) {
    return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.';
  }
  if (!isAdult(dateStr)) {
    return customMsg || 'Debes ser mayor de 18 años.';
  }
  return null;
}
