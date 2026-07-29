import api from './api';

export async function uploadImage(
  productId: number,
  file: File,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('es_principal', 'true');
      await api.post(`/productos/${productId}/imagen/`, fd);
      return;
    } catch (imgErr) {
      if (attempt === 1) throw imgErr;
    }
  }
}
