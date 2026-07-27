// Attachment type constants — single source of truth (D4).

export const ATTACHMENT_TYPES = {
  IMAGEN: 'imagen',
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

export type AttachmentType =
  (typeof ATTACHMENT_TYPES)[keyof typeof ATTACHMENT_TYPES];
