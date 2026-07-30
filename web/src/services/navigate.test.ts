import { describe, expect, it, vi, beforeEach } from 'vitest';

import { setNavigate, redirect } from './navigate';

// ── Tests ──────────────────────────────────────────────────

describe('navigate service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('redirect with navigate function', () => {
    it('calls navigate function when it is set', () => {
      const nav = vi.fn();
      setNavigate(nav);

      redirect('/dashboard');

      expect(nav).toHaveBeenCalledWith('/dashboard', { state: undefined });
    });

    it('passes state to navigate function', () => {
      const nav = vi.fn();
      setNavigate(nav);

      redirect('/order/123', { orderId: 123, from: 'checkout' });

      expect(nav).toHaveBeenCalledWith('/order/123', {
        state: { orderId: 123, from: 'checkout' },
      });
    });

    it('passes empty state when called without state', () => {
      const nav = vi.fn();
      setNavigate(nav);

      redirect('/home');

      expect(nav).toHaveBeenCalledWith('/home', { state: undefined });
    });

    it('can be called multiple times with different paths', () => {
      const nav = vi.fn();
      setNavigate(nav);

      redirect('/page1');
      redirect('/page2');

      expect(nav).toHaveBeenCalledTimes(2);
      expect(nav).toHaveBeenNthCalledWith(1, '/page1', { state: undefined });
      expect(nav).toHaveBeenNthCalledWith(2, '/page2', { state: undefined });
    });
  });

  describe('setNavigate', () => {
    it('replaces the navigate function', () => {
      const nav1 = vi.fn();
      const nav2 = vi.fn();
      setNavigate(nav1);
      redirect('/a');
      setNavigate(nav2);
      redirect('/b');

      expect(nav1).toHaveBeenCalledTimes(1);
      expect(nav2).toHaveBeenCalledTimes(1);
    });

    it('redirect calls the latest navigate function after setNavigate', () => {
      const nav = vi.fn();
      setNavigate(nav);

      redirect('/page', { key: 'value' });

      expect(nav).toHaveBeenCalledWith('/page', { state: { key: 'value' } });
    });
  });
});
