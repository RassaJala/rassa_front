export function buildImageFormData(uri: string): FormData {
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
  const normalizedExt = ext === 'png' ? 'png' : 'jpeg';
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  formData.append('imagen', {
    uri,
    name: sanitizedFilename,
    type: `image/${normalizedExt}`,
  } as unknown as Blob);
  return formData;
}
