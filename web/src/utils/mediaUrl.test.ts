import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
});

import { mediaUrl } from './mediaUrl';

describe('mediaUrl', () => {
  it('returns null for null input', () => {
    expect(mediaUrl(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(mediaUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(mediaUrl('')).toBeNull();
  });

  it('rejects localhost HTTP URLs (not trusted for security)', () => {
    expect(mediaUrl('http://localhost:8000/img.jpg')).toBeNull();
  });

  it('passes through absolute HTTPS URLs from trusted domains', () => {
    expect(mediaUrl('https://api.example.com/photo.png')).toBe(
      'https://api.example.com/photo.png',
    );
  });

  it('strips path traversal from relative paths', () => {
    const result = mediaUrl('/uploads/../../etc/passwd');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
    expect(result).not.toContain('..');
  });

  it('prepends base URL to relative paths', () => {
    const result = mediaUrl('/uploads/photo.jpg');
    expect(result).toBe('https://api.example.com/uploads/photo.jpg');
  });

  it('prepends base URL and adds leading slash for paths without one', () => {
    const result = mediaUrl('uploads/photo.jpg');
    expect(result).toBe('https://api.example.com/uploads/photo.jpg');
  });

  it('normalizes leading slashes', () => {
    const result = mediaUrl('///uploads/img.png');
    expect(result).not.toContain('///');
    expect(result).toBe('https://api.example.com/uploads/img.png');
  });

  it('strips encoded traversal sequences', () => {
    const result = mediaUrl('/uploads/%2e%2e/etc/passwd');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
    expect(result).not.toContain('..');
  });

  it('strips encoded dots case-insensitively', () => {
    const result = mediaUrl('/uploads/%2E%2E/admin');
    expect(result).toBe('https://api.example.com/uploads/admin');
  });

  it('strips encoded slashes to prevent traversal', () => {
    const result = mediaUrl('/uploads/%2f..%2f..%2fetc/passwd');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
    expect(result).not.toContain('..');
  });

  it('preserves query params in relative paths', () => {
    const result = mediaUrl('/uploads/photo.jpg?token=abc123');
    expect(result).toBe(
      'https://api.example.com/uploads/photo.jpg?token=abc123',
    );
  });

  it('preserves hash fragments in relative paths', () => {
    const result = mediaUrl('/uploads/photo.jpg#section');
    expect(result).toBe('https://api.example.com/uploads/photo.jpg#section');
  });

  it('rejects external URLs from untrusted domains', () => {
    expect(mediaUrl('https://evil.com/payload.jpg')).toBeNull();
  });

  it('rejects localhost HTTP URLs even from other port (not trusted)', () => {
    expect(mediaUrl('http://localhost:3000/img.png')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(mediaUrl('http://')).toBeNull();
  });

  // ── Security: path traversal ──────────────────────────────

  it('SECURITY: blocks double-encoded traversal (%252e%252e)', () => {
    const result = mediaUrl('/uploads/%252e%252e/etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('%2e');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
  });

  it('SECURITY: blocks triple-encoded traversal (%25252e)', () => {
    const result = mediaUrl('/uploads/%25252e%25252e/etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('%2e');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
  });

  it('SECURITY: blocks unicode-encoded traversal (%c0%ae)', () => {
    const result = mediaUrl('/uploads/%c0%ae%c0%ae/etc/passwd');
    expect(result).not.toContain('..');
  });

  it('SECURITY: strips null bytes to prevent truncation attacks', () => {
    const result = mediaUrl('/uploads/photo.jpg%00.png');
    expect(result).not.toContain('%00');
    expect(result).toBe('https://api.example.com/uploads/photo.jpg.png');
  });

  // ── Security: dangerous URI schemes ───────────────────────

  it('SECURITY: blocks javascript: protocol in relative paths', () => {
    expect(mediaUrl('javascript:alert(1)')).toBeNull();
  });

  it('SECURITY: blocks data: protocol in relative paths', () => {
    expect(mediaUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('SECURITY: blocks vbscript: protocol in relative paths', () => {
    expect(mediaUrl('vbscript:MsgBox(1)')).toBeNull();
  });

  it('SECURITY: blocks blob: protocol in relative paths', () => {
    expect(mediaUrl('blob:http://evil.com/payload')).toBeNull();
  });

  it('SECURITY: blocks file: protocol in relative paths', () => {
    expect(mediaUrl('file:///etc/passwd')).toBeNull();
  });

  // ── Security: domain allowlist ────────────────────────────

  it('SECURITY: blocks URLs with embedded credentials', () => {
    expect(mediaUrl('https://user:pass@api.example.com/img.jpg')).toBeNull();
  });

  it('SECURITY: blocks URLs with username only', () => {
    expect(mediaUrl('https://admin@api.example.com/img.jpg')).toBeNull();
  });

  // ── Security: special characters ──────────────────────────

  it('SECURITY: strips script tags from relative paths', () => {
    const result = mediaUrl('/uploads/<script>alert(1)</script>.jpg');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('SECURITY: strips single quotes from paths', () => {
    const result = mediaUrl("/uploads/it's.jpg");
    expect(result).not.toContain("'");
  });

  it('SECURITY: strips double quotes from paths', () => {
    const result = mediaUrl('/uploads/"onclick="alert(1).jpg');
    expect(result).not.toContain('"');
  });

  it('SECURITY: strips backslashes from paths', () => {
    const result = mediaUrl('/uploads/..\\..\\etc\\passwd');
    expect(result).not.toContain('\\');
  });

  // ── Edge cases ────────────────────────────────────────────

  it('SECURITY: handles very long paths without overflow', () => {
    const longPath = '/uploads/' + 'a'.repeat(10000) + '.jpg';
    const result = mediaUrl(longPath);
    expect(result).toBeTruthy();
    expect(result!.length).toBeLessThan(20000);
  });

  it('SECURITY: handles paths with only dots', () => {
    const result = mediaUrl('/...///...');
    expect(result).not.toContain('..');
  });

  it('SECURITY: trusts the BASE_URL host for absolute URLs', () => {
    expect(mediaUrl('https://api.example.com/uploads/photo.jpg')).toBe(
      'https://api.example.com/uploads/photo.jpg',
    );
  });

  it('SECURITY: rejects absolute URLs from unknown hosts', () => {
    expect(mediaUrl('https://evil.com/steal.jpg')).toBeNull();
  });

  // ── Additional edge cases ────────────────────────────────

  it('handles unicode characters in relative path', () => {
    const result = mediaUrl('/uploads/niño.jpg');
    expect(result).toBeTruthy();
    expect(result).toContain('uploads');
  });

  it('rejects URL from evil domain with different port', () => {
    expect(mediaUrl('https://evil.com:8000/steal.jpg')).toBeNull();
  });

  it('rejects lookalike domain that is not an actual subdomain', () => {
    expect(mediaUrl('https://fakeapi.example.com/photo.jpg')).toBeNull();
  });

  it('rejects URL with only credentials and no path', () => {
    expect(mediaUrl('https://user:pass@api.example.com')).toBeNull();
  });

  it('handles path with mixed special characters', () => {
    const result = mediaUrl('/uploads/photo@2x_test.file.jpg');
    expect(result).toBeTruthy();
    expect(result).not.toContain('@');
  });

  it('handles path with accented characters', () => {
    const result = mediaUrl('/uploads/áéíóú.jpg');
    expect(result).toBeTruthy();
    expect(result).toContain('.jpg');
  });

  it('rejects absolute URL with credentials on trusted domain', () => {
    expect(mediaUrl('http://admin@localhost:8000/admin')).toBeNull();
  });

  it('handles path with parens and spaces-like chars', () => {
    const result = mediaUrl('/uploads/photo(1).jpg');
    expect(result).toBeTruthy();
  });

  it('rejects absolute URL from evil.com with port variation', () => {
    expect(mediaUrl('http://evil.com:8080/payload')).toBeNull();
  });

  it('handles path with numbers and dashes', () => {
    const result = mediaUrl('/uploads/photo-2026-01-15.jpg');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  // ── Real uploaded filenames (spaces must be encoded, not stripped) ──

  it('encodes spaces in relative paths instead of stripping them', () => {
    const result = mediaUrl('/documentos/WhatsApp Image.jpg');
    expect(result).toBe(
      'https://api.example.com/documentos/WhatsApp%20Image.jpg',
    );
  });

  it('encodes spaces in real WhatsApp-style filenames', () => {
    const result = mediaUrl(
      '/documentos/dec66a05ade04600aa2b89f8a50cc23d_WhatsApp Image 2026-07-14 at 10.06.40 PM.jpeg',
    );
    expect(result).toBe(
      'https://api.example.com/documentos/dec66a05ade04600aa2b89f8a50cc23d_WhatsApp%20Image%202026-07-14%20at%2010.06.40%20PM.jpeg',
    );
  });

  it('encodes spaces in real mp3 filenames with dashes', () => {
    const result = mediaUrl(
      '/documentos/bade5b7023ac4e73b22045b138f37992_Green A - Tragedia de amor.mp3',
    );
    expect(result).toBe(
      'https://api.example.com/documentos/bade5b7023ac4e73b22045b138f37992_Green%20A%20-%20Tragedia%20de%20amor.mp3',
    );
  });
});
