/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  DATE_REGEX,
  EMAIL_REGEX,
  formatPhoneNumber,
  isAdult,
  MAX_NOMBRE,
  MIN_PASSWORD_LENGTH,
  validateBirthdate,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordChange,
  validatePhone,
  validateRegistrationForm,
} from '@/utils/validation';

describe('validation utilities', () => {
  describe('EMAIL_REGEX', () => {
    it('matches valid emails', () => {
      expect(EMAIL_REGEX.test('test@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('user.name@domain.org')).toBe(true);
      expect(EMAIL_REGEX.test('user+tag@example.co.uk')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(EMAIL_REGEX.test('invalid')).toBe(false);
      expect(EMAIL_REGEX.test('@example.com')).toBe(false);
      expect(EMAIL_REGEX.test('test@')).toBe(false);
      expect(EMAIL_REGEX.test('test@.com')).toBe(false);
      expect(EMAIL_REGEX.test('')).toBe(false);
    });
  });

  describe('DATE_REGEX', () => {
    it('matches valid YYYY-MM-DD format', () => {
      expect(DATE_REGEX.test('2024-01-15')).toBe(true);
      expect(DATE_REGEX.test('2000-12-31')).toBe(true);
      expect(DATE_REGEX.test('1990-06-05')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(DATE_REGEX.test('15-01-2024')).toBe(false);
      expect(DATE_REGEX.test('2024/01/15')).toBe(false);
      expect(DATE_REGEX.test('2024-1-15')).toBe(false);
      expect(DATE_REGEX.test('2024-13-45')).toBe(false);
      expect(DATE_REGEX.test('invalid')).toBe(false);
      expect(DATE_REGEX.test('')).toBe(false);
    });
  });

  describe('cleanName', () => {
    it('removes numbers and special characters', () => {
      expect(cleanName('Juan123')).toBe('Juan');
      expect(cleanName('María-José')).toBe('MaríaJosé');
      expect(cleanName("O'Connor")).toBe('OConnor');
      expect(cleanName('Juan Pérez')).toBe('Juan Pérez');
    });

    it('preserves accented characters', () => {
      expect(cleanName('Álvaro')).toBe('Álvaro');
      expect(cleanName('Niño')).toBe('Niño');
      expect(cleanName('Peña')).toBe('Peña');
    });

    it('handles empty string', () => {
      expect(cleanName('')).toBe('');
    });
  });

  describe('cleanPhoneNumber', () => {
    it('extracts only digits, and truncates appropriately', () => {
      expect(cleanPhoneNumber('555-123-4567')).toBe('5551234567');
      expect(cleanPhoneNumber('(555) 123-4567')).toBe('5551234567');
      expect(cleanPhoneNumber('+52 555 123 4567')).toBe('525551234567');
      expect(cleanPhoneNumber('5551234567890')).toBe('5551234567'); // truncates to 10
    });

    it('handles empty string', () => {
      expect(cleanPhoneNumber('')).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10 digits as xxx-xxx-xx-xx', () => {
      expect(formatPhoneNumber('5551234567')).toBe('555-123-45-67');
    });

    it('handles partial input progressively', () => {
      expect(formatPhoneNumber('5')).toBe('5');
      expect(formatPhoneNumber('55')).toBe('55');
      expect(formatPhoneNumber('555')).toBe('555');
      expect(formatPhoneNumber('5551')).toBe('555-1');
      expect(formatPhoneNumber('55512')).toBe('555-12');
      expect(formatPhoneNumber('555123')).toBe('555-123');
      expect(formatPhoneNumber('5551234')).toBe('555-123-4');
      expect(formatPhoneNumber('55512345')).toBe('555-123-45');
      expect(formatPhoneNumber('555123456')).toBe('555-123-45-6');
    });

    it('handles empty string', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('cleanAddress', () => {
    it('filters invalid characters from address', () => {
      expect(cleanAddress('Calle 123, Col. Centro')).toBe(
        'Calle 123, Col. Centro',
      );
      expect(cleanAddress('Av. Principal #45-B')).toBe('Av. Principal #45-B');
      expect(cleanAddress('C/ Mayor 10, 2ºA')).toBe('C/ Mayor 10, 2A');
      expect(cleanAddress('Calle @#$%')).toBe('Calle #');
      expect(cleanAddress('Dirección!')).toBe('Dirección');
    });

    it('handles empty string', () => {
      expect(cleanAddress('')).toBe('');
    });
  });

  describe('isAdult', () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );

    const toDateStr = (date: Date): string =>
      date.toISOString().split('T')[0] ?? '';

    it('returns true for dates 18+ years ago', () => {
      const nineteenYearsAgo = new Date(
        today.getFullYear() - 19,
        today.getMonth(),
        today.getDate(),
      );
      expect(isAdult(toDateStr(nineteenYearsAgo))).toBe(true);
    });

    it('returns false for dates less than 18 years ago', () => {
      const seventeenYearsAgo = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate(),
      );
      expect(isAdult(toDateStr(seventeenYearsAgo))).toBe(false);
    });

    it('returns false for today (age 0)', () => {
      expect(isAdult(toDateStr(today))).toBe(false);
    });

    it('returns false for invalid date format', () => {
      expect(isAdult('invalid')).toBe(false);
      expect(isAdult('')).toBe(false);
      expect(isAdult('2024/01/01')).toBe(false);
    });

    it('handles edge case: exactly 18 years ago today', () => {
      expect(isAdult(toDateStr(eighteenYearsAgo))).toBe(true);
    });

    it('handles edge case: 18 years ago but birthday not yet this year', () => {
      const tomorrow = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate() + 1,
      );
      expect(isAdult(toDateStr(tomorrow))).toBe(false);
    });
  });

  describe('MIN_PASSWORD_LENGTH', () => {
    it('is 8', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });
  });

  describe('validateName', () => {
    it('retorna error si el valor está vacío', () => {
      expect(validateName('', 'nombre')).toBe('El nombre es obligatorio.');
    });

    it('retorna error si excede MAX_NOMBRE caracteres', () => {
      const longName = 'a'.repeat(MAX_NOMBRE + 1);
      expect(validateName(longName, 'nombre')).toBe(
        `El nombre no puede exceder ${MAX_NOMBRE} caracteres.`,
      );
    });

    it('retorna error si contiene números', () => {
      expect(validateName('Juan123', 'nombre')).toBe(
        'El nombre solo puede contener letras.',
      );
    });

    it('retorna null para un nombre válido con acentos', () => {
      expect(validateName('José María', 'nombre')).toBeNull();
    });

    it('usa el parámetro fieldName en el mensaje de error', () => {
      expect(validateName('', 'apellido paterno')).toBe(
        'El apellido paterno es obligatorio.',
      );
      expect(validateName('Ana123', 'apellido paterno')).toBe(
        'El apellido paterno solo puede contener letras.',
      );
    });
  });

  describe('validateBirthdate', () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    const toDateStr = (date: Date): string =>
      date.toISOString().split('T')[0] ?? '';

    it('retorna error si la fecha está vacía', () => {
      expect(validateBirthdate('')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('retorna error si el formato es inválido', () => {
      expect(validateBirthdate('15-01-2000')).toBe(
        'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
      );
      expect(validateBirthdate('2000/01/15')).toBe(
        'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
      );
    });

    it('retorna error si es menor de 18 años', () => {
      const seventeenYearsAgo = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate(),
      );
      expect(validateBirthdate(toDateStr(seventeenYearsAgo))).toBe(
        'Debes ser mayor de 18 años.',
      );
    });

    it('retorna null para una fecha adulta válida', () => {
      const nineteenYearsAgo = new Date(
        today.getFullYear() - 19,
        today.getMonth(),
        today.getDate(),
      );
      expect(validateBirthdate(toDateStr(nineteenYearsAgo))).toBeNull();
    });

    it('usa customMsg cuando se proporciona', () => {
      const seventeenYearsAgo = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate(),
      );
      expect(
        validateBirthdate(
          toDateStr(seventeenYearsAgo),
          'Debes ser mayor de 18 años para registrarte.',
        ),
      ).toBe('Debes ser mayor de 18 años para registrarte.');
    });

    it('retorna null para exactamente 18 años atrás (caso límite)', () => {
      expect(validateBirthdate(toDateStr(eighteenYearsAgo))).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('rejects empty string', () => {
      expect(validateEmail('')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects whitespace-only string', () => {
      expect(validateEmail('   ')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects invalid format', () => {
      expect(validateEmail('notanemail')).toBe(
        'Ingresa un correo electrónico válido.',
      );
    });

    it('accepts valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('rejects empty string', () => {
      expect(validatePassword('')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects too short password', () => {
      expect(validatePassword('abc')).toBe(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    });

    it('accepts valid password', () => {
      expect(validatePassword('secreta123')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('rejects empty string', () => {
      expect(validatePhone('')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects too short number', () => {
      expect(validatePhone('555')).toBe(
        'El teléfono debe tener exactamente 10 dígitos.',
      );
    });

    it('accepts 10-digit national number', () => {
      expect(validatePhone('5551234567')).toBeNull();
    });

    it('rejects 12-digit international number', () => {
      expect(validatePhone('525551234567')).toBe(
        'El teléfono debe tener exactamente 10 dígitos.',
      );
    });

    it('cleans number before validating', () => {
      expect(validatePhone('555-123-4567')).toBeNull();
    });
  });

  describe('validateBirthdate', () => {
    it('rejects empty string', () => {
      expect(validateBirthdate('')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects whitespace-only', () => {
      expect(validateBirthdate('   ')).toBe(
        'Por favor, completa todos los campos obligatorios.',
      );
    });

    it('rejects invalid format', () => {
      expect(validateBirthdate('01-15-2024')).toBe(
        'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
      );
    });

    it('rejects underage date', () => {
      const today = new Date();
      const recent = `${today.getFullYear() - 17}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(validateBirthdate(recent)).toBe('Debes ser mayor de 18 años.');
    });

    it('accepts adult date', () => {
      const today = new Date();
      const adult = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(validateBirthdate(adult)).toBeNull();
    });

    it('uses custom message for underage', () => {
      const today = new Date();
      const recent = `${today.getFullYear() - 17}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(validateBirthdate(recent, 'Eres menor.')).toBe('Eres menor.');
    });
  });

  describe('validatePasswordChange', () => {
    it('retorna null cuando todo es válido', () => {
      expect(
        validatePasswordChange('oldPass123', 'newPass456', 'newPass456'),
      ).toBeNull();
    });

    it('retorna error si algún campo está vacío', () => {
      expect(validatePasswordChange('', 'newPass123', 'newPass123')).toBe(
        'Por favor, completa todos los campos.',
      );
      expect(validatePasswordChange('oldPass123', '', 'newPass123')).toBe(
        'Por favor, completa todos los campos.',
      );
      expect(validatePasswordChange('oldPass123', 'newPass123', '')).toBe(
        'Por favor, completa todos los campos.',
      );
    });

    it('retorna error si la nueva contraseña es menor al mínimo', () => {
      expect(validatePasswordChange('oldPass123', 'short', 'short')).toBe(
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    });

    it('retorna error si la confirmación no coincide', () => {
      expect(
        validatePasswordChange('oldPass123', 'newPass456', 'different789'),
      ).toBe('La confirmación de la contraseña no coincide.');
    });

    it('retorna error si la nueva contraseña es igual a la actual', () => {
      expect(
        validatePasswordChange('samePass123', 'samePass123', 'samePass123'),
      ).toBe('La nueva contraseña debe ser diferente a la actual.');
    });
  });

  describe('validateRegistrationForm', () => {
    const validForm = {
      email: 'test@example.com',
      password: 'secret123',
      telefono: '5551234567',
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      fechaNacimiento: '2000-01-15',
      domicilio: 'Calle 123',
      localidadId: 1,
    };

    it('passes valid form', () => {
      expect(validateRegistrationForm(validForm)).toBeNull();
    });

    it('rejects missing required fields', () => {
      const result = validateRegistrationForm({
        ...validForm,
        nombre: '',
        localidadId: null,
      });
      expect(result).toBe('Por favor, completa todos los campos obligatorios.');
    });

    it('validates email format', () => {
      const result = validateRegistrationForm({
        ...validForm,
        email: 'invalid',
      });
      expect(result).toBe('Ingresa un correo electrónico válido.');
    });

    it('validates password when provided', () => {
      const result = validateRegistrationForm({
        ...validForm,
        password: 'abc',
      });
      expect(result).toBe('La contraseña debe tener al menos 8 caracteres.');
    });

    it('skips password validation when undefined', () => {
      const { password: _pw, ...formWithoutPassword } = validForm;
      const result = validateRegistrationForm(formWithoutPassword);
      expect(result).toBeNull();
    });
  });
});
