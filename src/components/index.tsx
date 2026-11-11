import React, { useMemo } from 'react';
import cx from 'classnames';
import noop from '@jswork/noop';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ReactList,
  getKey,
  renderSlot,
} from '@jswork/react-list';
import type {
  KeyExtractor,
  ReactListProps,
  Slot,
} from '@jswork/react-list';
import type {
  DragHandleProps,
  ReactDndListClassNames,
  ReactDndListProps,
  SortableItemContext,
} from './types';

const CLASS_NAME = 'react-dnd-list';
const VERSION = '__VERSION__';

/**
 * Reorders `value` by moving the item at `ids.indexOf(activeId)` to `ids.indexOf(overId)`.
 * `ids` must be the positional key array of `value`, with unique entries.
 * Returns `null` when either id is unknown or the indices are equal.
 */
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

type SortableRowProps<T> = {
  id: UniqueIdentifier;
  index: number;
  value: T[];
  slot: Slot<SortableItemContext<T>>;
  handleOnly: boolean;
  disabled: boolean;
  classNames?: ReactDndListClassNames;
};

function SortableRow<T>({
  id,
  index,
  value,
  slot,
  handleOnly,
  disabled,
  classNames,
}: SortableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const dragHandleProps: DragHandleProps = handleOnly
    ? ({ ...attributes, ...listeners, ref: setActivatorNodeRef } as DragHandleProps)
    : { ref: setActivatorNodeRef };

  const wrapperProps = handleOnly
    ? {}
    : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      className={cx(
        `${CLASS_NAME}__item`,
        classNames?.item,
        isDragging && classNames?.dragging
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...wrapperProps}
    >
      {renderSlot<SortableItemContext<T>>(
        slot,
        {
          item: value[index],
          index,
          data: value,
          dragHandleProps,
          isDragging,
        },
        id
      )}
    </div>
  );
}

function ReactDndList<T>(props: ReactDndListProps<T>) {
  const {
    value,
    onChange,
    keyExtractor,
    slots,
    handleOnly = false,
    direction = 'vertical',
    disabled = false,
    className,
    classNames,
    dndContextProps,
    sortableContextProps,
    ...rest
  } = props;

  const extractor = (keyExtractor ?? 'id') as KeyExtractor<T>;

  const ids = useMemo<UniqueIdentifier[]>(
    () => value.map((item, index) => getKey(item, index, value, extractor)),
    [value, extractor]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const defaultStrategy =
    direction === 'horizontal'
      ? horizontalListSortingStrategy
      : verticalListSortingStrategy;

  const { onDragEnd: userOnDragEnd, ...restDndContextProps } =
    dndContextProps ?? {};

  const handleDragEnd = (event: DragEndEvent) => {
    userOnDragEnd?.(event);
    if (disabled || !event.over) return;
    const next = reorder(value, ids, event.active.id, event.over.id);
    if (next) (onChange ?? noop)(next, event);
  };

  const itemSlot: Slot<SortableItemContext<T>> = (ctx) => (
    <SortableRow
      id={getKey(ctx.item, ctx.index, ctx.data, extractor)}
      index={ctx.index}
      value={ctx.data}
      slot={slots.item}
      handleOnly={handleOnly}
      disabled={disabled}
      classNames={classNames}
    />
  );

  const rootClassName = cx(
    CLASS_NAME,
    classNames?.root,
    className,
    value.length === 0 && classNames?.empty
  );

  const List = ReactList as React.ComponentType<ReactListProps<T>>;

  if (value.length === 0) {
    return (
      <div className={rootClassName} {...rest}>
        {renderSlot(slots.empty, { data: value })}
      </div>
    );
  }

  return (
    <div className={rootClassName} {...rest}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        {...restDndContextProps}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          {...sortableContextProps}
          items={ids}
          strategy={sortableContextProps?.strategy ?? defaultStrategy}
        >
          <List
            data={value}
            keyExtractor={extractor}
            slots={{ item: itemSlot }}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
}

ReactDndList.displayName = CLASS_NAME;
ReactDndList.version = VERSION;

export default ReactDndList;
