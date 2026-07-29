// Attachment rules — previously duplicated in AttachmentPicker (D4).

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateSize(fileSize: number): boolean {
  return fileSize <= MAX_FILE_SIZE;
}

export function isVideoAsset(type?: string | null): boolean {
  return type?.toLowerCase() === 'video';
}
