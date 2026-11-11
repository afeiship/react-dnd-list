import { arrayMove } from '@dnd-kit/sortable';
import type { UniqueIdentifier } from '@dnd-kit/core';

export function reorder<T>(
  value: T[],
  ids: UniqueIdentifier[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): T[] | null {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return null;
  return arrayMove(value, from, to);
}
