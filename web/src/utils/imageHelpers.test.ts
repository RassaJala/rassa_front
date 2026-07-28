import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { hideBrokenImage, revokeBlobUrl } from './imageHelpers';

// ── hideBrokenImage ────────────────────────────────────────

describe('hideBrokenImage', () => {
  it('sets display to none on the target element', () => {
    const el = document.createElement('img');
    el.style.display = 'block';

    const event = {
      currentTarget: el,
    } as unknown as React.SyntheticEvent<HTMLImageElement>;

    hideBrokenImage(event);
    expect(el.style.display).toBe('none');
  });

  it('works on an element with empty style', () => {
    const el = document.createElement('img');

    const event = {
      currentTarget: el,
    } as unknown as React.SyntheticEvent<HTMLImageElement>;

    hideBrokenImage(event);
    expect(el.style.display).toBe('none');
  });
});

// ── revokeBlobUrl ──────────────────────────────────────────

describe('revokeBlobUrl', () => {
  let revokeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    revokeSpy.mockRestore();
  });

  it('calls URL.revokeObjectURL with the given url', () => {
    revokeBlobUrl('blob:http://localhost/fake');
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/fake');
  });

  it('does NOT call URL.revokeObjectURL when url is null', () => {
    revokeBlobUrl(null);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('does NOT call URL.revokeObjectURL for empty string', () => {
    revokeBlobUrl('');
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('is safe to call multiple times with the same url', () => {
    revokeBlobUrl('blob:http://localhost/fake');
    revokeBlobUrl('blob:http://localhost/fake');
    expect(revokeSpy).toHaveBeenCalledTimes(2);
  });
});
