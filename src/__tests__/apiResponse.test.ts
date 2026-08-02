import { parseApiList } from '@/utils/apiResponse';

describe('parseApiList', () => {
  it('returns array as-is', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(parseApiList(items)).toEqual(items);
  });

  it('extracts from { data: [...] }', () => {
    const items = [{ id: 1 }];
    expect(parseApiList({ data: items })).toEqual(items);
  });

  it('extracts from { data: { results: [...] } }', () => {
    const items = [{ id: 1 }];
    expect(parseApiList({ data: { results: items } })).toEqual(items);
  });

  it('extracts from { results: [...] }', () => {
    const items = [{ id: 1 }];
    expect(parseApiList({ results: items })).toEqual(items);
  });

  it('returns [] for null', () => {
    expect(parseApiList(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(parseApiList(undefined)).toEqual([]);
  });

  it('returns [] for empty object', () => {
    expect(parseApiList({})).toEqual([]);
  });

  it('returns [] for non-array, non-object', () => {
    expect(parseApiList('string')).toEqual([]);
    expect(parseApiList(42)).toEqual([]);
  });
});
