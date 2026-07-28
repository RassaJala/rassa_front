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

  it('passes through absolute HTTP URLs from trusted domains', () => {
    expect(mediaUrl('http://localhost:8000/img.jpg')).toBe(
      'http://localhost:8000/img.jpg',
    );
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
    expect(result).not.toContain('%2e');
  });

  it('strips encoded dots case-insensitively', () => {
    const result = mediaUrl('/uploads/%2E%2E/admin');
    expect(result).toBe('https://api.example.com/uploads/admin');
  });

  it('strips encoded slashes to prevent traversal', () => {
    const result = mediaUrl('/uploads/%2f..%2f..%2fetc/passwd');
    expect(result).toBe('https://api.example.com/uploads/etc/passwd');
    expect(result).not.toContain('%2f');
  });

  it('rejects external URLs from untrusted domains', () => {
    expect(mediaUrl('https://evil.com/payload.jpg')).toBeNull();
  });

  it('passes through URLs from trusted domains', () => {
    expect(mediaUrl('http://localhost:3000/img.png')).toBe(
      'http://localhost:3000/img.png',
    );
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
});
