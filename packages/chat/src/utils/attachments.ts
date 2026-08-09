// Attachment rules — previously duplicated in AttachmentPicker (D4).

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateSize(fileSize: number): boolean {
  return fileSize <= MAX_FILE_SIZE;
}

export function isVideoAsset(type?: string | null): boolean {
  return type?.toLowerCase() === 'video';
}

const UNSAFE_FILENAME_CHARS = /[^A-Za-z0-9._-]+/g;

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
};

// Stored filenames reach the server as `{uuid}_{name}`. Spaces/special chars
// survive multipart encoding inconsistently (RN leaves literal `%20` on disk),
// which makes the media URL 404. Keep only URL-safe ASCII chars.
export function sanitizeFileName(name: string, mimeType?: string): string {
  const trimmed = name.trim();
  const extMatch = trimmed.match(/\.[A-Za-z0-9]+$/);
  const rawExt = extMatch?.[0];
  const extension =
    rawExt?.toLowerCase() ??
    EXTENSION_BY_MIME[(mimeType ?? '').toLowerCase()] ??
    '';
  const base = rawExt ? trimmed.slice(0, -rawExt.length) : trimmed;
  const safeBase = base
    .replace(UNSAFE_FILENAME_CHARS, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 60);
  return `${safeBase || 'archivo'}${extension}`;
}
