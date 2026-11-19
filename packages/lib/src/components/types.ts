import type React from 'react';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import type {
  SortableContextProps,
  useSortable,
} from '@dnd-kit/sortable';
import type {
  ItemContext,
  KeyExtractor,
  Slot,
} from '@jswork/react-list';

type SortableResult = ReturnType<typeof useSortable>;

/**
 * Props to spread onto a drag handle element.
 * handleOnly=true: full attributes + listeners + ref.
 * handleOnly=false: listeners live on the row wrapper; only ref is provided.
 */
export type DragHandleProps = Partial<SortableResult['attributes']> &
  Partial<NonNullable<SortableResult['listeners']>> & {
    ref: SortableResult['setActivatorNodeRef'];
  };

export type SortableItemContext<T> = ItemContext<T> & {
  dragHandleProps: DragHandleProps;
  isDragging: boolean;
};

export interface ReactDndListClassNames {
  root?: string;
  item?: string;
  dragging?: string;
  empty?: string;
}

export interface ReactDndListProps<T>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  value: T[];
  onChange?: (next: T[], event: DragEndEvent) => void;
  keyExtractor?: KeyExtractor<T>;
  slots: {
    item: Slot<SortableItemContext<T>>;
    empty?: Slot<{ data: T[] }>;
  };
  handleOnly?: boolean;
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
  classNames?: ReactDndListClassNames;
  dndContextProps?: DndContextProps;
  sortableContextProps?: Omit<SortableContextProps, 'items' | 'children'>;
}
