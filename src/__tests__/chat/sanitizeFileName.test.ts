/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import { sanitizeFileName } from '@rassa/chat';

describe('sanitizeFileName', () => {
  it('keeps already-safe names unchanged', () => {
    expect(sanitizeFileName('grabacion-1785525534153.m4a')).toBe(
      'grabacion-1785525534153.m4a',
    );
    expect(sanitizeFileName('foto.jpg', 'image/jpeg')).toBe('foto.jpg');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('listen before i go.mp3')).toBe(
      'listen_before_i_go.mp3',
    );
    expect(
      sanitizeFileName('WhatsApp Image 2026-07-14 at 10.06.40 PM.jpeg'),
    ).toBe('WhatsApp_Image_2026-07-14_at_10.06.40_PM.jpeg');
  });

  it('replaces parentheses, accents and percent escapes', () => {
    expect(sanitizeFileName('d_as_azules_(SkySound.cc)%20(1).mp3')).toBe(
      'd_as_azules_SkySound.cc_20_1.mp3',
    );
    expect(sanitizeFileName('canción rara.mp3')).toBe('canci_n_rara.mp3');
  });

  it('derives an extension from the mime type when missing', () => {
    expect(sanitizeFileName('media_12345', 'video/mp4')).toBe(
      'media_12345.mp4',
    );
    expect(sanitizeFileName('IMG_0035', 'video/quicktime')).toBe(
      'IMG_0035.mov',
    );
    expect(sanitizeFileName('', 'image/jpeg')).toBe('archivo.jpg');
  });

  it('collapses repeated underscores and truncates long names', () => {
    expect(sanitizeFileName('a--b  c___d.jpg')).toBe('a--b_c_d.jpg');
    const long = `${'x'.repeat(120)}.png`;
    expect(sanitizeFileName(long).length).toBeLessThanOrEqual(65);
    expect(sanitizeFileName(long)).toMatch(/\.png$/);
  });
});
