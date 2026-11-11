# react-dnd-list
> A lightweight, accessible draggable list component built with dnd-kit + @jswork/react-list.

[![version][version-image]][version-url]
[![license][license-image]][license-url]

## installation
```shell
pnpm add @jswork/react-dnd-list
```

> `react` / `react-dom` 是 peerDependencies（>=18）。dnd-kit 与 `@jswork/react-list` 已随包安装。

## usage
1. import css
  ```scss
  @import "~@jswork/react-dnd-list/dist/style.css";
  ```
2. import js
  ```tsx
  import React, { useState } from 'react';
  import ReactDndList from '@jswork/react-dnd-list';

  const initial = [
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' },
  ];

  export default () => {
    const [items, setItems] = useState(initial);

    return (
      <ReactDndList
        value={items}
        onChange={setItems}
        handleOnly
        classNames={{ item: 'row', dragging: 'row--active' }}
        slots={{
          item: ({ item, dragHandleProps }) => (
            <>
              <button {...dragHandleProps}>⠿</button>
              <span>{item.name}</span>
            </>
          ),
          empty: () => <p>No data</p>,
        }}
      />
    );
  };
  ```

## api

| prop | type | default | desc |
|---|---|---|---|
| `value` | `T[]` | 必填 | 受控数据，组件不修改它 |
| `onChange` | `(next: T[], event: DragEndEvent) => void` | - | 拖拽完成后回传新顺序 |
| `keyExtractor` | `KeyExtractor<T>` | `'id'` | 与 `@jswork/react-list` 完全一致，支持 `SELF` / `INDEX` / dot path / 函数 |
| `slots.item` | `Slot<SortableItemContext<T>>` | 必填 | 每行内容；上下文含 `item` / `index` / `data` / `dragHandleProps` / `isDragging` |
| `slots.empty` | `Slot<{ data: T[] }>` | - | 空状态 |
| `handleOnly` | `boolean` | `false` | `true` = 仅 `dragHandleProps` 可拖；`false` = 整行可拖 |
| `direction` | `'vertical' \| 'horizontal'` | `'vertical'` | sortingStrategy 快捷方式 |
| `disabled` | `boolean` | `false` | 禁用拖拽，`onChange` 不触发 |
| `className` | `string` | - | 合并到根容器 |
| `classNames` | `{ root?, item?, dragging?, empty? }` | - | 细粒度 class，全部经 `classnames` 合并 |
| `dndContextProps` | `DndContextProps` | - | 逃生舱，展开到 `DndContext`；`onDragEnd` 作为前置回调转发 |
| `sortableContextProps` | `Omit<SortableContextProps, 'items' \| 'children'>` | - | 逃生舱；`items` 由内部接管，`strategy` 优先于 `direction` |

导出：`default`、`ReactDndList`、`SELF`、`INDEX`、`reorder` 及全部类型。

## important notes

- **`handleOnly={true}` 时必须在 slot 里渲染并 spread `dragHandleProps`**，否则整列表拖不动。这是 dnd-kit 的固有约束，组件不做运行时检测。
- `keyExtractor` 产出的 id 必须唯一；id 重复时 dnd-kit 行为未定义。
- 不使用 `DragOverlay`：拖起的就是行本身。若根容器设了 `overflow: hidden`，拖到边缘会被裁切 —— 用 `dndContextProps.modifiers` 或自行包裹 `DragOverlay`。
- 空列表不会创建 `DndContext` / `SortableContext`。
- 键盘可访问性由 `PointerSensor` + `KeyboardSensor` + `sortableKeyboardCoordinates` 提供（空格拾起、方向键移动、空格放下、Esc 取消）。

## preview
- https://afeiship.github.io/react-dnd-list/

## license
MIT

[version-image]: https://img.shields.io/npm/v/@jswork/react-dnd-list
[version-url]: https://npmjs.org/package/@jswork/react-dnd-list
[license-image]: https://img.shields.io/npm/l/@jswork/react-dnd-list
[license-url]: https://github.com/afeiship/react-dnd-list/blob/master/LICENSE.txt
