export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const NAME_REGEX = /^[\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NOMBRE = 100;

export function cleanName(val: string): string {
  // Solo letras (con acentos), espacios — sin apóstrofes ni guiones
  return val.replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
}

export function cleanPhoneNumber(val: string): string {
  // Match web: strip spaces, hyphens, parentheses, plus — preserve digits
  return val.replace(/[\s()+-]+/g, '');
}

export function formatPhoneNumber(val: string): string {
  const cleaned = val.replace(/\D/g, '');
  const hasPlus = val.trim().startsWith('+');
  if (cleaned.length === 0) {
    return hasPlus ? '+' : '';
  }

  if (cleaned.length <= 3) {
    return hasPlus ? `+${cleaned}` : cleaned;
  }
  if (cleaned.length <= 6) {
    const formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return hasPlus ? `+${formatted}` : formatted;
  }
  if (cleaned.length <= 8) {
    const formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return hasPlus ? `+${formatted}` : formatted;
  }
  const formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  return hasPlus ? `+${formatted}` : formatted;
}

export function cleanAddress(val: string): string {
  // Match web: no character filter, only max length enforced at submit
  return val;
}

export function isAdult(birthDate: string): boolean {
  if (!DATE_REGEX.test(birthDate)) return false;
  const parts = birthDate.split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10) - 1;
  const day = parseInt(parts[2] ?? '0', 10);
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

export function validateName(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `El ${fieldName} es obligatorio.`;
  }
  if (value.length > MAX_NOMBRE) {
    return `El ${fieldName} no puede exceder ${MAX_NOMBRE} caracteres.`;
  }
  if (!NAME_REGEX.test(value)) {
    return `El ${fieldName} solo puede contener letras.`;
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) {
    return 'Por favor, completa todos los campos obligatorios.';
  }
  if (cleaned.length !== 10) {
    return 'El teléfono debe tener exactamente 10 dígitos.';
  }
  return null;
}

export function validateBirthdate(
  dateStr: string,
  customMsg?: string,
): string | null {
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

export function validateProfileEdit(
  nombre: string,
  apellidoPaterno: string,
  rawTelefono: string,
  fechaNacimiento: string,
  domicilio: string,
  localidadId: number | null,
): string | null {
  if (
    !nombre.trim() ||
    !apellidoPaterno.trim() ||
    !rawTelefono ||
    !fechaNacimiento.trim() ||
    !domicilio.trim() ||
    localidadId === null
  ) {
    return 'Por favor, completa todos los campos obligatorios.';
  }

  const nameErr = validateName(nombre, 'nombre');
  if (nameErr) return nameErr;

  const lastNameErr = validateName(apellidoPaterno, 'apellido paterno');
  if (lastNameErr) return lastNameErr;

  const phoneErr = validatePhone(rawTelefono);
  if (phoneErr) return phoneErr;

  const birthdateErr = validateBirthdate(fechaNacimiento);
  if (birthdateErr) return birthdateErr;

  return null;
}

export function validateRegistrationForm({
  email,
  password,
  telefono,
  nombre,
  apellidoPaterno,
  fechaNacimiento,
  domicilio,
  localidadId,
  customAgeMsg,
}: {
  readonly email: string;
  readonly password?: string;
  readonly telefono: string;
  readonly nombre: string;
  readonly apellidoPaterno: string;
  readonly fechaNacimiento: string;
  readonly domicilio: string;
  readonly localidadId: number | null;
  readonly customAgeMsg?: string;
}): string | null {
  const rawTelefono = cleanPhoneNumber(telefono);

  if (email.trim()) {
    const emailErr = validateEmail(email);
    if (emailErr) return emailErr;
  }

  if (password !== undefined && password) {
    const passErr = validatePassword(password);
    if (passErr) return passErr;
  }

  if (rawTelefono) {
    const phoneErr = validatePhone(rawTelefono);
    if (phoneErr) return phoneErr;
  }

  if (fechaNacimiento.trim()) {
    const birthdateErr = validateBirthdate(
      fechaNacimiento,
      customAgeMsg || 'Debes ser mayor de 18 años para registrarte.',
    );
    if (birthdateErr) return birthdateErr;
  }

  if (
    !email.trim() ||
    (password !== undefined && !password) ||
    !rawTelefono ||
    !nombre.trim() ||
    !apellidoPaterno.trim() ||
    !fechaNacimiento.trim() ||
    !domicilio.trim() ||
    localidadId === null
  ) {
    return 'Por favor, completa todos los campos obligatorios.';
  }

  return null;
}

export function validatePasswordChange(
  oldPass: string,
  newPass: string,
  confirmPass: string,
): string | null {
  if (!oldPass || !newPass || !confirmPass) {
    return 'Por favor, completa todos los campos.';
  }

  if (newPass.length < MIN_PASSWORD_LENGTH) {
    return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (newPass !== confirmPass) {
    return 'La confirmación de la contraseña no coincide.';
  }

  if (oldPass === newPass) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  return null;
}
