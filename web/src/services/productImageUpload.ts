import api from './api';

async function uploadOne(
  productId: number,
  file: File,
  esPrincipal: boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('es_principal', String(esPrincipal));
      await api.post(`/productos/${productId}/imagen/`, fd, {
        headers: { 'Content-Type': undefined },
      });
      return;
    } catch (imgErr) {
      if (attempt === 1) throw imgErr;
    }
  }
}

export async function uploadImage(
  productId: number,
  file: File,
): Promise<void> {
  return uploadOne(productId, file, true);
}

export async function uploadProductImages(
  productId: number,
  files: File[],
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    await uploadOne(productId, files[i]!, i === 0);
  }
}
