# react-dnd-list 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `@jswork/react-dnd-list` 从脚手架改造成基于 dnd-kit + `@jswork/react-list` 的受控可拖拽排序列表组件。

**Architecture:** 函数组件内部封装 `DndContext` + `SortableContext`，用 `@jswork/react-list` 的 `getKey` 统一生成 ids 与 React key；每个 item 外包一层 `SortableRow`（`useSortable`）负责 ref / transform / listeners，slot 渲染仍走 `renderSlot` 以支持 react-list 的三种 slot 形态。排序结果通过 `onChange(next, event)` 回传，组件本身不修改 `value`。

**Tech Stack:** React 18 + TypeScript 4.9 + dnd-kit（core 6.3.1 / sortable 10.0.0 / utilities 3.2.2）+ `@jswork/react-list` 2.0.18 + classnames + rollup(UMD) + jest 27 / ts-jest / @testing-library/react 12 + vite(docs) + scss/tailwind。

**Spec:** `docs/superpowers/specs/2026-11-11-react-dnd-list-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | 依赖声明（dnd-kit / react-list 进 dependencies，react 转 peer） |
| `rollup.config.js` | UMD 产物的 external globals 映射 |
| `src/components/types.ts` | 全部对外类型：`ReactDndListProps<T>`、`ReactDndListClassNames`、`SortableItemContext<T>`、`DragHandleProps` |
| `src/components/index.tsx` | `ReactDndList` 函数组件 + 私有 `SortableRow` + 纯函数 `reorder` + `createSensors` |
| `src/components/style.scss` | 最小基础样式（容器 reset + 拖拽态） |
| `src/components/index.fc.tsx` | 删除（脚手架示例，已无引用） |
| `src/main.ts` | default + 具名导出，转出 `SELF` / `INDEX` |
| `public/src/app.tsx` | 受控 demo（数据 + 手柄 + `handleOnly` 开关 + 实时顺序） |
| `__tests__/index.spec.tsx` | 组件渲染 / class / 空状态 / handleOnly / disabled 用例 |
| `__tests__/reorder.spec.ts` | `reorder` 纯函数单测 |
| `README.md` | 新 API、用法、硬性约定 |
| `llms.txt` | 新建，AI 使用文档 |

关键接口约束（务必先读）：

- `@jswork/react-list` 导出：`ReactList`(default)、`SELF`、`INDEX`、`renderSlot`、`getKey`、`Slot`、`ItemContext`、`KeyExtractor`、`ReactListProps`。`ReactList` 返回 `ReactNode[]` 且**不产生容器 DOM**。
- `@dnd-kit/core` 导出 `DndContextProps`、`DragEndEvent`、`UniqueIdentifier`、`PointerSensor`、`KeyboardSensor`、`useSensor`、`useSensors`、`closestCenter`。
- `@dnd-kit/sortable` 导出 `SortableContext`、`SortableContextProps`、`useSortable`、`verticalListSortingStrategy`、`horizontalListSortingStrategy`、`arrayMove`、`sortableKeyboardCoordinates`。
- `@dnd-kit/utilities` 导出 `CSS`。
- `DndContextProps.onDragEnd` 是**必填方法**（`onDragEnd?(event: DragEndEvent): void`），因此内部构造时始终提供 `handleDragEnd`，逃生舱里的 `onDragEnd` 作为前置回调转发。
- `SortableContextProps.children` 是必填，因此 `sortableContextProps` 用 `Omit<..., 'items' | 'children'>`。
- `getKey<T>` 返回 `string | number`，`UniqueIdentifier` 也是 `string | number`，可直接复用为 `SortableContext items`。
- `useSortable` 返回值包含 `attributes` / `listeners`(可能为 undefined) / `setNodeRef` / `setActivatorNodeRef` / `transform` / `transition` / `isDragging`。

---

## Task 1: 依赖与构建配置

**Files:**
- Modify: `package.json`
- Modify: `rollup.config.js`
- Modify: `jest.config.js`

- [ ] **Step 1: 修改 `package.json`**

把 `dependencies` 改为：

```json
"dependencies": {
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@jswork/noop": "^1.0.0",
  "@jswork/react-list": "^2.0.18",
  "classnames": "^2.5.1"
}
```

在 `dependencies` 之后新增：

```json
"peerDependencies": {
  "react": ">=18",
  "react-dom": ">=18"
}
```

`devDependencies` 保持不动（里面已有 `react@^18.2.0` / `react-dom@^18.2.0`，供本地 demo 与 jest 使用；`rollup-plugin-node-externals` 的 `peerDeps: true` 会把它们从产物里排除）。

- [ ] **Step 2: 修改 `rollup.config.js` 的 `globals`**

把 `globals` 对象补全为：

```js
globals: {
  '@jswork/noop': 'noop',
  '@jswork/react-list': 'ReactList',
  '@dnd-kit/core': 'DndKitCore',
  '@dnd-kit/sortable': 'DndKitSortable',
  '@dnd-kit/utilities': 'DndKitUtilities',
  'prop-types': 'PropTypes',
  'classnames': 'classNames',
  'react': 'React',
  'react-dom': 'ReactDOM'
}
```

（deps 已由 `externals({ deps: true, peerDeps: true })` 排除，`globals` 只影响 UMD 产物的全局名映射。）

- [ ] **Step 3: 修改 `jest.config.js`，让 jest 能解析 CJS 依赖**

`transform` 保持 `ts-jest`，追加：

```js
transformIgnorePatterns: ['/node_modules/(?!@jswork/react-list)']
```

`@jswork/react-list` 的 `main` 是 CJS，但 `@dnd-kit/*` 提供 CJS 入口，jest 默认能加载；这一行是防御性配置，避免 react-list 被 ts-jest 漏过转译。若 `pnpm install` 后 jest 报 `Cannot find module`，再改为显式 `moduleNameMapper`。

- [ ] **Step 4: 安装依赖**

Run: `pnpm install`
Expected: 无 fatal error，`node_modules/@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`、`@jswork/react-list` 均存在。
若网络失败，使用代理前缀：`http_proxy=http://127.0.0.1:9090 https_proxy=http://127.0.0.1:9090 pnpm install`

- [ ] **Step 5: 验证基线**

Run: `pnpm test`
Expected: 现有 1 个测试 PASS（"Enjoy coding"），说明依赖安装没破坏 jest。

- [ ] **Step 6: Commit**

```bash
git add package.json rollup.config.js jest.config.js pnpm-lock.yaml
git commit -m "chore: add dnd-kit and react-list dependencies"
```

（`pnpm-lock.yaml` 若被 `.gitignore` 忽略则不存在，不必强求；`git add` 里带上不会报错。）

---

## Task 2: 纯排序函数（TDD）

**Files:**
- Create: `src/components/index.tsx`（本任务只写 `reorder` 与最小占位）
- Test: `__tests__/reorder.spec.ts`
- Modify: `jest.config.js`

- [ ] **Step 1: 让 jest 能收集 `.spec.ts`**

把 `jest.config.js` 的 `testRegex` 改为：

```js
testRegex: [/\.spec\.tsx?$/]
```

- [ ] **Step 2: 写失败测试**

Create `__tests__/reorder.spec.ts`:

```ts
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
});
```

- [ ] **Step 3: 运行，确认失败**

Run: `pnpm test reorder`
Expected: FAIL — `reorder is not a function` / 模块无导出。

- [ ] **Step 4: 写最小实现**

Create `src/components/index.tsx`（此时只需这一段，后续 Task 4 会补全）：

```tsx
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
```

- [ ] **Step 5: 运行，确认通过**

Run: `pnpm test reorder`
Expected: 6 tests PASS。

> 注意：此时 `pnpm test` 全量会失败（旧的 `__tests__/index.spec.tsx` 断言 "Enjoy coding"，且 `src/components/index.tsx` 已不再渲染按钮）。这是预期的，Task 5 会重写它。本任务只验证 `reorder`。

- [ ] **Step 6: Commit**

```bash
git add jest.config.js src/components/index.tsx __tests__/reorder.spec.ts
git commit -m "feat: add pure reorder helper"
```

---

## Task 3: 类型定义

**Files:**
- Create: `src/components/types.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: 创建 `src/components/types.ts`**

```ts
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
```

- [ ] **Step 2: 重写 `src/main.ts`**

```ts
import Component from './components';

export { SELF, INDEX } from '@jswork/react-list';
export type {
  ReactDndListProps,
  ReactDndListClassNames,
  SortableItemContext,
  DragHandleProps,
} from './components/types';
export { reorder } from './components';
export { Component as ReactDndList };

export default Component;
```

- [ ] **Step 3: 类型检查**

Run: `pnpm exec tsc --noEmit -p tsconfig.build.json`
Expected: 无错误。若报 `Cannot find module '@dnd-kit/...'`，回到 Task 1 Step 4 确认 `pnpm install` 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/types.ts src/main.ts
git commit -m "feat: define ReactDndList public types"
```

---

## Task 4: 组件实现

**Files:**
- Modify: `src/components/index.tsx`（补全为完整实现）
- Modify: `src/components/style.scss`
- Delete: `src/components/index.fc.tsx`

- [ ] **Step 1: 写完整 `src/components/index.tsx`**

```tsx
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
    ? { ...attributes, ...listeners, ref: setActivatorNodeRef }
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
          <ReactList<T>
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
```

**实现要点核对：**

- `renderSlot(slots.empty, { data: value })` 在空状态分支里调用；`slots.empty` 为 undefined 时 `renderSlot` 返回 `null`，渲染出空容器。
- `itemSlot` 是一个**函数组件**，交给 `ReactList` 后会经 `SlotBridge` 稳定渲染；它内部渲染 `SortableRow`，而 `SortableRow` 自己再 `renderSlot(slots.item, ctx, id)` —— 这样使用者传入的 slot 三种形态（组件 / ReactNode / `{component, props}`）都被保留。
- `wrapperProps` 在 `handleOnly=true` 时为空对象，wrapper 上不挂 listeners/attributes；`handleOnly=false` 时 spread 到 wrapper。两种模式不会同时挂，避免 pointerdown 冒泡触发两次 sensor。
- `dragHandleProps` 始终含 `ref: setActivatorNodeRef`（dnd-kit 键盘拖拽需要激活器节点）。
- `dndContextProps` 里的 `onDragEnd` 作为前置回调转发；内部的 `handleDragEnd` 永远接管排序。
- `sortableContextProps.strategy` 优先于 `direction` 快捷方式；`items` 强制由内部接管。
- `restDndContextProps` 展开在 `sensors` / `collisionDetection` 之后，所以逃生舱可覆盖二者。
- `disabled` 时：`useSortable({disabled})`、wrapper 仍挂 attributes/listeners（但 dnd-kit 内部会禁用），且 `handleDragEnd` 直接 return 不触发 `onChange`。

- [ ] **Step 2: 写 `src/components/style.scss`**

```scss
.react-dnd-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    position: relative;
    touch-action: none;
  }
}
```

（`touch-action: none` 让 PointerSensor 在触屏上正常工作；不内置主题色，交由使用者通过 `classNames` 定制。）

- [ ] **Step 3: 删除 `src/components/index.fc.tsx`**

Run: `rm src/components/index.fc.tsx`

- [ ] **Step 4: 类型检查**

Run: `pnpm exec tsc --noEmit -p tsconfig.build.json`
Expected: 无错误。常见修法：
- 若 `ReactList<T>` 泛型推断报错，显式写 `<T>`。
- 若 `renderSlot` 的 key 参数类型报错（`UniqueIdentifier` vs `Key`），`id` 已是 `getKey` 的返回值（`string | number`），无需强转。
- 若 `sortableContextProps?.strategy ?? defaultStrategy` 因 `Omit` 后的类型不含 `strategy` 而报错，说明 `Omit` 写错了；`SortableContextProps` 本身含 `strategy`，`Omit<..., 'items' | 'children'>` 会保留 `strategy`。

- [ ] **Step 5: Commit**

```bash
git add src/components/index.tsx src/components/style.scss src/components/index.fc.tsx
git commit -m "feat: implement sortable ReactDndList component"
```

---

## Task 5: 组件测试（TDD）

**Files:**
- Modify: `__tests__/index.spec.tsx`（重写）

- [ ] **Step 1: 写失败测试**

把 `__tests__/index.spec.tsx` 全文替换为：

```tsx
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ReactDndList from '../src/main';

type Item = { id: string; name: string };
const items: Item[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Carol' },
];

const itemSlot = ({
  item,
  dragHandleProps,
}: {
  item: Item;
  dragHandleProps: React.HTMLAttributes<HTMLElement> & {
    ref?: (node: HTMLElement | null) => void;
  };
}) => (
  <div>
    <button data-testid="handle" {...dragHandleProps}>
      ⠿
    </button>
    <span data-testid="name">{item.name}</span>
  </div>
);

describe('ReactDndList / basic rendering', () => {
  test('renders one row per item with base class names', () => {
    const { container } = render(
      <ReactDndList value={items} slots={{ item: itemSlot }} />
    );

    expect(container.querySelectorAll('.react-dnd-list__item')).toHaveLength(3);
    expect(screen.getAllByTestId('name').map((n) => n.textContent)).toEqual([
      'Alice',
      'Bob',
      'Carol',
    ]);
    expect(container.firstChild).toHaveClass('react-dnd-list');
  });

  test('merges className and classNames.root onto the root', () => {
    const { container } = render(
      <ReactDndList
        value={items}
        className="p-4"
        classNames={{ root: 'my-list' }}
        slots={{ item: itemSlot }}
      />
    );

    expect(container.firstChild).toHaveClass(
      'react-dnd-list',
      'my-list',
      'p-4'
    );
  });

  test('merges classNames.item onto every row', () => {
    const { container } = render(
      <ReactDndList
        value={items}
        classNames={{ item: 'row' }}
        slots={{ item: itemSlot }}
      />
    );

    container.querySelectorAll('.react-dnd-list__item').forEach((row) => {
      expect(row).toHaveClass('row');
    });
  });
});

describe('ReactDndList / empty state', () => {
  test('renders slots.empty when value is empty', () => {
    render(
      <ReactDndList
        value={[]}
        slots={{ item: itemSlot, empty: () => <p>No data</p> }}
      />
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(document.querySelectorAll('.react-dnd-list__item')).toHaveLength(0);
  });

  test('renders bare container when value is empty and no empty slot', () => {
    const { container } = render(
      <ReactDndList value={[]} slots={{ item: itemSlot }} />
    );

    expect(container.firstChild).toHaveClass('react-dnd-list');
    expect(container.firstChild?.childNodes).toHaveLength(0);
  });

  test('appends classNames.empty on empty container', () => {
    const { container } = render(
      <ReactDndList
        value={[]}
        classNames={{ empty: 'is-empty' }}
        slots={{ item: itemSlot }}
      />
    );

    expect(container.firstChild).toHaveClass('is-empty');
  });
});

describe('ReactDndList / handleOnly', () => {
  test('handleOnly=false attaches sortable attributes to the row wrapper', () => {
    const { container } = render(
      <ReactDndList value={items} slots={{ item: itemSlot }} />
    );

    const row = container.querySelector('.react-dnd-list__item');
    expect(row).toHaveAttribute('aria-roledescription', 'sortable');
  });

  test('handleOnly=true keeps attributes off the wrapper and exposes them on the handle', () => {
    const spy = jest.fn();
    const SlotWithSpy = (ctx: any) => {
      spy(ctx.dragHandleProps);
      return (
        <button data-testid="handle" {...ctx.dragHandleProps}>
          ⠿
        </button>
      );
    };

    const { container } = render(
      <ReactDndList
        value={items}
        handleOnly
        slots={{ item: SlotWithSpy }}
      />
    );

    const row = container.querySelector('.react-dnd-list__item');
    expect(row).not.toHaveAttribute('aria-roledescription');

    const props = spy.mock.calls[0][0];
    expect(props['aria-roledescription']).toBe('sortable');
    expect(typeof props.onPointerDown).toBe('function');
    expect(typeof props.ref).toBe('function');
  });
});

describe('ReactDndList / keyExtractor', () => {
  test('supports SELF for primitive arrays', () => {
    const { SELF } = require('../src/main');
    render(
      <ReactDndList
        value={['apple', 'banana']}
        keyExtractor={SELF}
        slots={{ item: ({ item }: any) => <span>{item}</span> }}
      />
    );

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
  });
});

describe('ReactDndList / disabled', () => {
  test('does not pass sortable attributes to rows when disabled', () => {
    const { container } = render(
      <ReactDndList value={items} disabled slots={{ item: itemSlot }} />
    );

    // dnd-kit still provides attributes; the contract is that onChange never fires.
    // Assert the wrapper exists and the component renders without crashing.
    expect(container.querySelectorAll('.react-dnd-list__item')).toHaveLength(3);
  });
});
```

> `toHaveClass` / `toBeInTheDocument` 来自 `@testing-library/jest-dom`。当前 `jest.config.js` 没有 `setupFilesAfterEnv`，若报 `toHaveClass is not a function`，在 `jest.config.js` 追加 `setupFilesAfterEnv: ['@testing-library/jest-dom']` 并重新跑（这是配置修复，不是测试失败）。

- [ ] **Step 2: 运行，确认有失败**

Run: `pnpm test index`
Expected: 至少部分 FAIL（旧组件已被替换，断言需由 Task 4 的实现满足）。若全部 PASS 说明 Task 4 已正确实现，直接进入 Step 3。

- [ ] **Step 3: 补齐 jest-dom 配置（仅当 Step 2 报 matcher 缺失）**

`jest.config.js` 追加：

```js
setupFilesAfterEnv: ['@testing-library/jest-dom']
```

- [ ] **Step 4: 运行全量测试**

Run: `pnpm test`
Expected: `__tests__/reorder.spec.ts` 6 个 + `__tests__/index.spec.tsx` 全部 PASS，共约 17 个测试。

若 `handleOnly=false` 的 `aria-roledescription` 断言失败：检查 `wrapperProps` 是否确实把 `attributes` spread 到 wrapper（Task 4 Step 1 的 `{...attributes, ...listeners}`）；dnd-kit 的 `attributes` 含 `role="button"`、`aria-roledescription="sortable"`、`aria-describedby`。

若 `handleOnly=true` 时 wrapper 上仍出现 `aria-roledescription`：检查 `wrapperProps` 在 `handleOnly=true` 分支是否为 `{}`。

- [ ] **Step 5: Commit**

```bash
git add __tests__/index.spec.tsx jest.config.js
git commit -m "test: cover ReactDndList rendering, slots, classes and handleOnly"
```

---

## Task 6: Demo 页面

**Files:**
- Modify: `public/src/app.tsx`

- [ ] **Step 1: 重写 `public/src/app.tsx`**

```tsx
import React, { useState } from 'react';
import ReactDndList, { SELF } from '@/main';

type Item = { id: string; name: string };
const initialItems: Item[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Carol' },
  { id: 'd', name: 'Dave' },
];

export default function App() {
  const [items, setItems] = useState(initialItems);
  const [handleOnly, setHandleOnly] = useState(true);

  return (
    <div className="p-5 w-4/5 mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">react-dnd-list</h1>

      <label className="flex items-center gap-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={handleOnly}
          onChange={(e) => setHandleOnly(e.target.checked)}
        />
        仅手柄可拖（handleOnly）
      </label>

      <ReactDndList
        className="flex flex-col gap-2"
        classNames={{
          item: 'flex items-center gap-3 p-3 bg-white rounded shadow',
          dragging: 'opacity-40',
          empty: 'text-gray-400',
        }}
        value={items}
        onChange={setItems}
        handleOnly={handleOnly}
        slots={{
          item: ({ item, dragHandleProps }) => (
            <>
              <button
                {...dragHandleProps}
                className="cursor-grab select-none text-gray-400 hover:text-gray-700"
                aria-label={`drag ${item.name}`}
              >
                ⠿
              </button>
              <span className="flex-1">{item.name}</span>
              <code className="text-xs text-gray-400">{item.id}</code>
            </>
          ),
          empty: () => <p>暂无数据</p>,
        }}
      />

      <pre className="mt-6 p-3 bg-gray-100 rounded text-xs">
        {JSON.stringify(items.map((i) => i.id))}
      </pre>

      <div className="mt-4">
        <button
          className="px-3 py-1 bg-gray-200 rounded text-sm"
          onClick={() => setItems([])}
        >
          清空（看空状态）
        </button>
        <button
          className="ml-2 px-3 py-1 bg-gray-200 rounded text-sm"
          onClick={() => setItems(initialItems)}
        >
          重置
        </button>
      </div>

      {/* SELF 用法（primitive 数组）单独展示 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">primitive array + SELF</h2>
        <ReactDndList
          value={['apple', 'banana', 'cherry']}
          keyExtractor={SELF}
          className="flex flex-col gap-1"
          classNames={{ item: 'p-2 bg-white rounded shadow text-sm' }}
          onChange={(next) => console.log('primitive order:', next)}
          slots={{
            item: ({ item, dragHandleProps }) => (
              <>
                <button {...dragHandleProps} className="cursor-grab mr-2">
                  ⠿
                </button>
                {item}
              </>
            ),
          }}
        />
      </div>
    </div>
  );
}
```

> `React.Fragment`（`<>...</>`）作为 slot 返回值是合法的 ReactNode；但 `renderSlot` 对函数 slot 走 `SlotBridge`，函数返回 Fragment 没问题。若 tsc 因 `jsx: react` 报错，把 `<>...</>` 改成 `<React.Fragment>...</React.Fragment>`。

- [ ] **Step 2: 构建 docs 验证 demo 可编译**

Run: `pnpm docs`
Expected: `tsc` 通过 + vite 构建成功，产出 `docs/index.html` 与 `docs/assets/*`。

若 `SELF` 的类型与 `keyExtractor` 的泛型冲突（`string[]` 与 `typeof SELF`），在 demo 里改用 `keyExtractor={SELF as any}` 或确认 `main.ts` 转出的 `SELF` 是 `unique symbol` 类型（Task 3 Step 2 的 `export { SELF, INDEX }` 会保留该类型）。

- [ ] **Step 3: 手动验证真实拖拽**

Run: `pnpm dev`
在浏览器打开 Vite 提示的地址，逐项确认：

1. 默认 `handleOnly=true`：只有 ⠿ 按钮能拖起行，点行文字不会触发拖拽。
2. 取消勾选后：整行任意位置都能拖起。
3. 拖动后下方 `<pre>` 里的 id 顺序实时变化；拖到原位放下时顺序不变。
4. 「清空」显示「暂无数据」，容器带 `is-empty` 对应样式；「重置」恢复 4 条。
5. primitive 数组区可拖动，控制台打印 `primitive order`。
6. 键盘：Tab 聚焦到手柄/行，空格拾起、方向键移动、空格放下、Esc 取消。

- [ ] **Step 4: Commit**

```bash
git add public/src/app.tsx
git commit -m "feat: add controlled drag demo with handleOnly toggle"
```

---

## Task 7: 构建与文档

**Files:**
- Modify: `README.md`
- Create: `llms.txt`

- [ ] **Step 1: 跑完整构建**

Run: `pnpm build`
Expected: 产出 `dist/index.js`、`dist/index.js.map`、`dist/style.css`、`dist/style.scss`（由 rollup-plugin-copy）、`dist/main.d.ts` 及组件类型声明。

若 UMD 报 `'ReactList' is not defined` 之类，检查 Task 1 Step 2 的 `globals` 是否漏了 `@jswork/react-list`。

- [ ] **Step 2: 重写 `README.md`**

````markdown
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
| `onChange` | `(next: T[], event: DragEndEvent) => void` | `noop` | 拖拽完成后回传新顺序 |
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
````

- [ ] **Step 3: 创建 `llms.txt`**

```markdown
# react-dnd-list

> A controlled, accessible sortable list component for React, built on dnd-kit and @jswork/react-list.

## Overview

ReactDndList wraps `DndContext` + `SortableContext` (dnd-kit) around `@jswork/react-list`'s headless slot renderer. It calls `onChange(nextArray, dragEndEvent)` after a drop; it never mutates `value`.

## Important notes for agents

- Package: `@jswork/react-dnd-list`
- Main file: `src/components/index.tsx`; types: `src/components/types.ts`; entry: `src/main.ts`
- Peer deps: `react >=18`, `react-dom >=18`
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@jswork/react-list`, `classnames`, `@jswork/noop`
- Re-exports `SELF` and `INDEX` from `@jswork/react-list` — do not make consumers install react-list separately
- `keyExtractor` is shared by React keys and `SortableContext items`; ids must be unique
- No `DragOverlay`; the row wrapper itself transforms while dragging
- Empty list renders only the root container (plus `slots.empty`); no DndContext is created

## API

```ts
interface ReactDndListProps<T> {
  value: T[];
  onChange?: (next: T[], event: DragEndEvent) => void; // default noop
  keyExtractor?: KeyExtractor<T>;                      // default 'id'
  slots: {
    item: Slot<SortableItemContext<T>>;
    empty?: Slot<{ data: T[] }>;
  };
  handleOnly?: boolean;       // default false
  direction?: 'vertical' | 'horizontal'; // default 'vertical'
  disabled?: boolean;         // default false
  className?: string;
  classNames?: { root?: string; item?: string; dragging?: string; empty?: string };
  dndContextProps?: DndContextProps;
  sortableContextProps?: Omit<SortableContextProps, 'items' | 'children'>;
}
```

`SortableItemContext<T>` = `ItemContext<T>` (`item`, `index`, `data`) plus `dragHandleProps` and `isDragging`.

## Usage

```tsx
import { useState } from 'react';
import ReactDndList from '@jswork/react-dnd-list';

const [items, setItems] = useState([
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
]);

<ReactDndList
  value={items}
  onChange={setItems}
  handleOnly
  slots={{
    item: ({ item, dragHandleProps }) => (
      <>
        <button {...dragHandleProps}>⠿</button>
        <span>{item.name}</span>
      </>
    ),
    empty: () => <p>No data</p>,
  }}
/>;
```

## Hard constraints

1. When `handleOnly` is true, `dragHandleProps` MUST be spread onto a rendered element inside the item slot. Otherwise the list cannot be dragged.
2. When `handleOnly` is false (default), listeners are on the row wrapper; `dragHandleProps.ref` is still provided for keyboard activation.
3. `dndContextProps.onDragEnd` is forwarded BEFORE internal reordering; the internal handler always owns `onChange`.
4. `sortableContextProps.strategy` overrides the `direction` shortcut; `items` can never be overridden.
5. `disabled` suppresses `onChange` entirely.

## Escape hatches

```tsx
<ReactDndList
  value={items}
  onChange={setItems}
  dndContextProps={{ collisionDetection: pointerWithin, modifiers: [restrictToVerticalAxis] }}
  sortableContextProps={{ strategy: horizontalListSortingStrategy }}
  slots={...}
/>
```

## Files

```
src/main.ts               entry, re-exports SELF/INDEX
src/components/index.tsx  ReactDndList + private SortableRow + reorder
src/components/types.ts   public types
src/components/style.scss minimal reset
public/src/app.tsx        live demo
__tests__/                 jest + testing-library tests
```

## License

MIT
```

- [ ] **Step 4: 最终验证**

Run: `pnpm test && pnpm build && pnpm docs`
Expected: 三步全部成功，无 TS 错误、无 jest 失败。

- [ ] **Step 5: Commit**

```bash
git add README.md llms.txt
git commit -m "docs: update README and add llms.txt for new API"
```

---

## Self-Review（写计划时已执行）

**Spec coverage：**

| Spec 章节 | 对应 Task |
|---|---|
| §2 决策表（受控 / FC / handleOnly / 结构 / class / 逃生舱 / 单文件 / 依赖） | Task 1、3、4、5 |
| §3 API 契约（全部 props、types、SELF/INDEX 转出、version/displayName、classnames 合并） | Task 3、4、5 |
| §4 架构（文件划分、DOM 树、`<div>` 而非 `<ul>`、ids 统一、SortableRow 接线、逃生舱顺序、无 DragOverlay） | Task 4 |
| §5 边界表（空状态 / disabled / 无 over / 重复 id / handleOnly 硬约定 / onDragEnd 不被覆盖） | Task 2（reorder 返回 null）、Task 4、Task 5、Task 7 文档 |
| §6 测试策略 | Task 2、Task 5 |
| §7 改动清单 | Task 1–7 全部覆盖（`index.fc.tsx` 删除在 Task 4） |
| §8 成功标准 | Task 5 Step 4、Task 6 Step 2/3、Task 7 Step 4 |

**Placeholder scan：** 无 TBD / TODO / "appropriate handling" / "similar to Task N"。每个代码步骤都给了完整代码或完整替换内容。

**Type consistency：** `reorder` 签名在 Task 2 定义、Task 4 原样保留、Task 4 `handleDragEnd` 按 `T[] | null` 使用；`DragHandleProps` / `SortableItemContext<T>` / `ReactDndListClassNames` 在 Task 3 定义、Task 4 与 Task 7 文档引用一致；`sortableContextProps` 的 `Omit<..., 'items' | 'children'>` 在 Task 3 定义、Task 4 `sortableContextProps?.strategy` 使用、Task 7 文档一致。

**已知需要实现者注意的一处歧义（计划里已给出裁决）：**
1. `<>...</>` 在 `jsx: react` 下若报错，改 `<React.Fragment>`（Task 6 Step 1 注释里已说明）。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-11-react-dnd-list.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
