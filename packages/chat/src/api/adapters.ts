// FormData adapter — RN {uri,name,type} vs web File.
// Guard `'uri' in doc`: RN has no global `File`, so `instanceof` is unsafe (§4 Fase 2.3).
// ponytail: plan example used key "documento"; kept "archivo" to match the
// existing shipped backend contract (behavior-identical acceptance).

export type DocumentInput = File | { uri: string; name: string; type: string };

export function appendDocument(fd: FormData, doc: DocumentInput): void {
  if ('uri' in doc) {
    fd.append('archivo', doc as unknown as Blob);
  } else {
    fd.append('archivo', doc, doc.name);
  }
}
