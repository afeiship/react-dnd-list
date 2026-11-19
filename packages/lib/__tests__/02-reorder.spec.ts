import { reorder } from '../src/components';

describe('reorder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('moves an item forward', () => {
    expect(reorder(items, ['a', 'b', 'c'], 'a', 'c')).toEqual([
      { id: 'b' },
      { id: 'c' },
      { id: 'a' },
    ]);
  });

  test('moves an item backward', () => {
    expect(reorder(items, ['a', 'b', 'c'], 'c', 'a')).toEqual([
      { id: 'c' },
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  test('returns null for same index', () => {
    expect(reorder(items, ['a', 'b', 'c'], 'b', 'b')).toBeNull();
  });

  test('returns null when active id is unknown', () => {
    expect(reorder(items, ['a', 'b', 'c'], 'zzz', 'a')).toBeNull();
  });

  test('returns null when over id is unknown', () => {
    expect(reorder(items, ['a', 'b', 'c'], 'a', 'zzz')).toBeNull();
  });

  test('does not mutate the input array', () => {
    const snapshot = [...items];
    reorder(items, ['a', 'b', 'c'], 'a', 'c');
    expect(items).toEqual(snapshot);
  });

  test('supports numeric ids (INDEX fallback path)', () => {
    const nums = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    expect(reorder(nums, [0, 1, 2], 2, 0)).toEqual([
      { id: 'z' },
      { id: 'x' },
      { id: 'y' },
    ]);
  });

  test('returns a new array reference', () => {
    const result = reorder(items, ['a', 'b', 'c'], 'a', 'c');
    expect(result).not.toBe(items);
  });
});
