/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test file */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { uploadImage } from '../services/productImageUpload';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: { post: vi.fn() },
}));

const mockPost = api.post as unknown as vi.Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFile(name = 'foto.jpg', type = 'image/jpeg'): File {
  return new File(['dummy'], name, { type });
}

describe('uploadImage', () => {
  it('arma FormData con campo imagen y es_principal', async () => {
    mockPost.mockResolvedValueOnce({});
    const file = makeFile();

    await uploadImage(5, file);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, fd] = mockPost.mock.calls[0] as [string, FormData];

    expect(url).toBe('/productos/5/imagen/');

    expect(fd.get('imagen')).toBe(file);
    expect(fd.get('es_principal')).toBe('true');
  });

  it('reintenta una vez si el primer intento falla', async () => {
    mockPost
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({});
    const file = makeFile('manzana.png', 'image/png');

    await uploadImage(12, file);

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0]![0]).toBe('/productos/12/imagen/');
    expect(mockPost.mock.calls[1]![0]).toBe('/productos/12/imagen/');
  });

  it('lanza error si ambos intentos fallan', async () => {
    mockPost
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'));
    const file = makeFile();

    await expect(uploadImage(3, file)).rejects.toThrow('fail 2');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('no envía campos extra en el FormData', async () => {
    mockPost.mockResolvedValueOnce({});
    const file = makeFile();

    await uploadImage(1, file);

    const fd = mockPost.mock.calls[0]![1] as FormData;
    const keys: string[] = [];
    fd.forEach((_val, key) => {
      keys.push(key);
    });
    expect(keys).toEqual(['imagen', 'es_principal']);
  });
});
