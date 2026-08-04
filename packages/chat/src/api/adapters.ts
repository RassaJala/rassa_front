// FormData adapter — RN {uri,name,type} vs web File.
// Guard `'uri' in doc`: RN has no global `File`, so `instanceof` is unsafe (§4 Fase 2.3).

import { sanitizeFileName } from '../utils/attachments';

export type DocumentInput = File | { uri: string; name: string; type: string };

export function appendDocument(fd: FormData, doc: DocumentInput): void {
  const name = sanitizeFileName(doc.name, doc.type);
  if ('uri' in doc) {
    fd.append('documento', { ...doc, name } as unknown as Blob);
  } else {
    fd.append('documento', doc, name);
  }
}
