import { describe, expect, it } from 'vitest';
import {
  decideScroll,
  initialScrollState,
  type ScrollState,
} from './chatScroll';

describe('decideScroll', () => {
  it('returns none when there are no messages yet', () => {
    const { action, next } = decideScroll(initialScrollState, 0, 0);
    expect(action).toBe('none');
    expect(next).toBe(initialScrollState);
  });

  it('returns initial for the first content arrival', () => {
    const { action, next } = decideScroll(initialScrollState, 1, 25);
    expect(action).toBe('initial');
    expect(next).toEqual({
      didInitialScroll: true,
      lastPageCount: 1,
      lastMessageCount: 25,
    });
  });

  it('returns pagination when an older page is prepended', () => {
    const state: ScrollState = {
      didInitialScroll: true,
      lastPageCount: 1,
      lastMessageCount: 25,
    };
    const { action, next } = decideScroll(state, 2, 75);
    expect(action).toBe('pagination');
    expect(next).toEqual({
      didInitialScroll: true,
      lastPageCount: 2,
      lastMessageCount: 75,
    });
  });

  it('returns append when new messages arrive without a new page', () => {
    const state: ScrollState = {
      didInitialScroll: true,
      lastPageCount: 1,
      lastMessageCount: 25,
    };
    const { action, next } = decideScroll(state, 1, 26);
    expect(action).toBe('append');
    expect(next).toEqual({
      didInitialScroll: true,
      lastPageCount: 1,
      lastMessageCount: 26,
    });
  });

  it('returns none when the message count did not change', () => {
    const state: ScrollState = {
      didInitialScroll: true,
      lastPageCount: 2,
      lastMessageCount: 75,
    };
    const { action, next } = decideScroll(state, 2, 75);
    expect(action).toBe('none');
    expect(next).toEqual(state);
  });

  it('returns pagination even when the count grows on a page change', () => {
    const state: ScrollState = {
      didInitialScroll: true,
      lastPageCount: 2,
      lastMessageCount: 75,
    };
    const { action } = decideScroll(state, 3, 101);
    expect(action).toBe('pagination');
  });

  it('returns initial again after the state was reset', () => {
    const { action } = decideScroll(initialScrollState, 1, 10);
    expect(action).toBe('initial');
  });
});
