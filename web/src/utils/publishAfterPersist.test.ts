import { describe, expect, it, vi } from 'vitest';
import { publishAfterPersist } from './publishAfterPersist';

vi.mock('./logger', () => ({
  logError: vi.fn(),
}));

import { logError } from './logger';

describe('publishAfterPersist', () => {
  const navigateFn = vi.fn();
  const publishFn = vi.fn();
  const mountedRef = { current: true };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls publishFn and navigates on success', async () => {
    publishFn.mockResolvedValue(undefined);
    await publishAfterPersist(1, publishFn, navigateFn, mountedRef);
    expect(publishFn).toHaveBeenCalledWith(1);
    expect(navigateFn).toHaveBeenCalledOnce();
  });

  it('navigates when mounted', async () => {
    publishFn.mockResolvedValue(undefined);
    await publishAfterPersist(1, publishFn, navigateFn, { current: true });
    expect(navigateFn).toHaveBeenCalledOnce();
  });

  it('skips navigation when unmounted', async () => {
    publishFn.mockResolvedValue(undefined);
    await publishAfterPersist(1, publishFn, navigateFn, { current: false });
    expect(navigateFn).not.toHaveBeenCalled();
  });

  it('does not navigate on publish failure', async () => {
    publishFn.mockRejectedValue(new Error('publish failed'));
    await expect(
      publishAfterPersist(1, publishFn, navigateFn, mountedRef),
    ).rejects.toThrow(
      'Se guardó el borrador, pero falló la publicación. Intentá publicar desde la lista.',
    );
    expect(logError).toHaveBeenCalledWith(
      'publishAfterPersist',
      expect.any(Error),
      { pubId: 1 },
    );
    expect(navigateFn).not.toHaveBeenCalled();
  });

  it('logs original error on failure', async () => {
    const original = new Error('network timeout');
    publishFn.mockRejectedValue(original);
    await expect(
      publishAfterPersist(1, publishFn, navigateFn, mountedRef),
    ).rejects.toThrow();
    expect(vi.mocked(logError).mock.calls[0]?.[1]).toBe(original);
  });
});
