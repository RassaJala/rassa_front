/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  DATE_REGEX,
  EMAIL_REGEX,
  formatPhoneNumber,
  isAdult,
  MIN_PASSWORD_LENGTH,
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
    it('extracts only digits up to 10', () => {
      expect(cleanPhoneNumber('555-123-4567')).toBe('5551234567');
      expect(cleanPhoneNumber('(555) 123-4567')).toBe('5551234567');
      expect(cleanPhoneNumber('+52 555 123 4567')).toBe('525551234567');
      expect(cleanPhoneNumber('5551234567890')).toBe('5551234567'); // max 10
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
    it('preserves allowed characters (#, ,, -, ., /, numbers, letters, accents)', () => {
      expect(cleanAddress('Calle 123, Col. Centro')).toBe(
        'Calle 123, Col. Centro',
      );
      expect(cleanAddress('Av. Principal #45-B')).toBe('Av. Principal #45-B');
      expect(cleanAddress('C/ Mayor 10, 2ºA')).toBe('C/ Mayor 10, 2A');
    });

    it('removes disallowed characters', () => {
      expect(cleanAddress('Calle @#$%')).toBe('Calle #');
      expect(cleanAddress('Dirección!')).toBe('Direccin');
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
    it('is 6', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(6);
    });
  });
});
