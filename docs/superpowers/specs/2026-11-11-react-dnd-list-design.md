# react-dnd-list 设计文档

> 日期：2026-11-11
> 状态：已确认，待进入实现计划
> 项目：`/Users/afei/github/react-dnd-list`（`@jswork/react-dnd-list`）

## 1. 背景与目标

当前仓库是 `@jswork/react-dnd-list` 的脚手架：`src/components/index.tsx` 是一个 class 组件，只渲染 "Enjoy coding~" 按钮；`index.fc.tsx` 是未使用的 FC 示例；已有 `value` / `onChange` / `className` props 雏形；依赖里没有 dnd-kit，也没有 `@jswork/react-list`。

目标：用 **dnd-kit** 实现一个可拖拽排序的列表组件，列表渲染部分复用 headless 的 `@jswork/react-list`（仓库：https://github.com/afeiship/react-list ，npm 包 `@jswork/react-list` v2.0.18）。

### 参考：react-list 的关键事实

- 导出 `ReactList<T>`、`SELF`、`INDEX`、`Slot`、`ItemContext`、`KeyExtractor`、`ReactListProps`、`renderSlot`、`getKey`、`isSlotConfig`。
- `ReactList` 返回 `ReactNode[]`，**不产生容器 DOM**，也不给 item 注入 ref。
- slot 支持三种形态：React 组件、ReactNode、`{ component, props }`。
- key 提取支持 `SELF` / `INDEX` / `keyof T` / dot path / 函数；默认 `'id'`。
- 泛型 `<T>` 保证类型安全。

### 核心张力

dnd-kit 的 `useSortable` 需要一个真实 DOM 节点挂 `setNodeRef` 与 listeners，而 react-list 的 item slot 由使用者提供、组件内部无法改写其根节点。因此组件必须在每个 item 外**包一层 wrapper**，并把拖拽能力通过 slot props 注入给使用者。

## 2. 已确认的决策

| 决策点 | 结论 |
|---|---|
| API 边界 | 受控完整组件：内部封装 `DndContext` + `SortableContext` + `arrayMove`，`onChange` 输出新顺序；使用者无需接触 dnd-kit |
| 组件形态 | 改成函数组件（dnd-kit 的 `useSortable` / `useSensors` 是 hooks，class 里无法调用） |
| 触发方式 | 一个 prop `handleOnly?: boolean`，默认 `false` |
| 结构 | 组件自带根容器 + 每个 item 一层 wrapper（预览里的方案 A） |
| 容器 class | 保留 `className`（根）+ 新增 `classNames` 对象（`root` / `item` / `dragging` / `empty`），全部用 `classnames` 合并 |
| dnd-kit 配置 | 最小封装 + 逃生舱 `dndContextProps` / `sortableContextProps` |
| 实现粒度 | 方案一：单文件直给，`SortableRow` 内联在 `index.tsx`，不拆独立 hook |
| 依赖 | `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`、`@jswork/react-list` 全进 `dependencies`；`react` / `react-dom` 转 `peerDependencies`（devDependencies 保留一份供本地开发） |

版本（2026-11-11 查询）：`@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0`、`@dnd-kit/utilities@3.2.2`、`@jswork/react-list@2.0.18`。

## 3. API 契约

```ts
// src/components/types.ts
import type { DragEndEvent, DndContextProps } from '@dnd-kit/core';
import type { SortableContextProps, useSortable } from '@dnd-kit/sortable';
import type { ItemContext, KeyExtractor, Slot } from '@jswork/react-list';

type SortableResult = ReturnType<typeof useSortable>;

/**
 * spread 到手柄元素上（含 setActivatorNodeRef）。
 * handleOnly=true 时含完整 attributes + listeners；
 * handleOnly=false 时 listeners 已挂在 wrapper 上，这里仅含 ref（手柄为纯视觉提示）。
 */
export type DragHandleProps = Partial<SortableResult['attributes']> &
  Partial<NonNullable<SortableResult['listeners']>> & {
    ref: SortableResult['setActivatorNodeRef'];
  };

/** 传给 slots.item 的上下文 = react-list 原生 ItemContext + 拖拽增强 */
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
  /** 受控数据，组件内部永不修改它 */
  value: T[];
  /** 拖拽完成后回传新顺序 */
  onChange?: (next: T[], event: DragEndEvent) => void;
  /** 与 @jswork/react-list 完全一致，默认 'id' */
  keyExtractor?: KeyExtractor<T>;
  slots: {
    item: Slot<SortableItemContext<T>>;
    empty?: Slot<{ data: T[] }>;
  };
  /** true = listeners 只走 dragHandleProps；false = 整行可拖。默认 false */
  handleOnly?: boolean;
  /** 映射到 sortingStrategy，默认 'vertical' */
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
  classNames?: ReactDndListClassNames;
  /** 逃生舱：展开到 DndContext */
  dndContextProps?: DndContextProps;
  /** 逃生舱：展开到 SortableContext，items 由内部接管 */
  sortableContextProps?: Omit<SortableContextProps, 'items'>;
}
```

刻意定死的点：

- `slots.item` 仍是完整的 `Slot<...>`（组件 / ReactNode / `{component, props}` 三种形态都支持）。内部用 `@jswork/react-list` 导出的 `renderSlot` 渲染，不自己 `slot(ctx)`，否则会丢掉后两种形态和它的稳定 fiber 机制。
- `main.ts` 除 default 导出外，具名导出 `ReactDndList`、全部类型，并**转出 `SELF` / `INDEX`** —— 既然 `keyExtractor` 是本库的 prop，这两个符号不该逼使用者再装一遍 react-list。
- 保留 `ReactDndList.version` / `.displayName`（挂到函数组件上），沿用脚手架现有约定。
- class 全部走 `classnames` 合并：根 = `cx('react-dnd-list', classNames?.root, className)`；行 = `cx('react-dnd-list__item', classNames?.item, isDragging && classNames?.dragging)`。

## 4. 架构与数据流

### 文件划分

```
src/main.ts               default + 具名导出、转出 SELF/INDEX
src/components/index.tsx  ReactDndList + 模块内私有 SortableRow
src/components/types.ts   Props / ClassNames / SortableItemContext / DragHandleProps
src/components/style.scss 基础样式（仅 reset + is-dragging 视觉，不强制设计）
```

`src/components/index.fc.tsx` 删除（脚手架示例，已被 `index.tsx` 取代）。

### 组件树 / DOM

```
<div class="react-dnd-list {classNames.root} {className}" ...rest>
  └─ DndContext ─ SortableContext(items=ids)
       └─ ReactList(data=value, keyExtractor, slots.item=itemSlot)
            └─ <SortableRow key={id}>            ← 每个 item 一层的 wrapper
                 └─ <div ref=setNodeRef class="react-dnd-list__item ...">
                      └─ renderSlot(用户的 slots.item, 增强后的 ctx)
```

根容器和行 wrapper 用 `<div>` 而不是 `<ul>/<li>`：空状态和非标准 slot 内容放进 `<ul>` 会产生非法 HTML，且 dnd-kit 的 `attributes` 自带 `role="button"` / `aria-roledescription="sortable"`，会覆盖 `<li>` 的 listitem 语义。a11y 完全交给 dnd-kit `attributes` + `KeyboardSensor`，组件不手写 role。

### ids 与 key 统一

用 `@jswork/react-list` 导出的 `getKey(item, index, value, keyExtractor)` 算出 `ids: UniqueIdentifier[]`，同时作为 `SortableContext items` 和 `ReactList` 的 key 来源 —— **只有一套 key 逻辑**，不会出现排序 id 与 React key 不一致。

`onDragEnd` 里 `ids.indexOf(active.id)` → `arrayMove(value, oldIndex, newIndex)` → `onChange(next, event)`；无 `over`、或原地放下、或 `disabled` 时不触发 `onChange`。组件全程不修改 `value`。

### SortableRow 接线

```tsx
const { attributes, listeners, setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging } = useSortable({ id, disabled });
```

- wrapper：`ref={setNodeRef}`、`style={{ transform: CSS.Transform.toString(transform), transition }}`、class 用 `cx('react-dnd-list__item', classNames?.item, isDragging && classNames?.dragging)`。
- `handleOnly=false`（默认）：`attributes + listeners` 挂在 **wrapper** 上；注入 slot 的 `dragHandleProps` 只含 `{ ref: setActivatorNodeRef }`，手柄是纯视觉提示。
- `handleOnly=true`：wrapper 不挂 listeners；`dragHandleProps = { ...attributes, ...listeners, ref: setActivatorNodeRef }`，**使用者必须渲染并 spread 它，否则列表拖不动**（写成文档里的硬性约定）。

刻意避免「wrapper 和手柄同时挂 listeners」—— React 事件冒泡会让 pointerdown 触发两次 sensor 激活。禁用拖拽时 `useSortable({ disabled })` 且不挂 listeners。

### 逃生舱合并顺序

```tsx
<DndContext
  sensors={sensors}                       // PointerSensor + KeyboardSensor 默认
  collisionDetection={closestCenter}
  {...restDndContextProps}               // 可覆盖上面两项
  onDragEnd={handleDragEnd}              // 永远由内部接管
/>
<SortableContext
  {...sortableContextProps}              // strategy 可覆盖 direction 快捷方式
  items={ids}                            // 强制由内部接管，不可覆盖
/>
```

`handleDragEnd` 先转发 `dndContextProps.onDragEnd?.(event)`，再执行排序与 `onChange` —— 逃生舱不会意外掐掉 `onChange`。`direction` 只是 `verticalListSortingStrategy` / `horizontalListSortingStrategy` 的快捷方式，`sortableContextProps.strategy` 优先级更高。**不使用 DragOverlay**，拖起的就是 wrapper 本身。

## 5. 边界约束与失败模式

| 场景 | 行为 |
|---|---|
| `value=[]` 且 `slots.empty` | 渲染空槽，**跳过** `DndContext`/`SortableContext`（空列表不需要拖拽上下文），空容器 class 追加 `classNames?.empty` |
| `value=[]` 无 `slots.empty` | 渲染空容器（`<div class="react-dnd-list" />`），不报错 |
| `disabled=true` | `useSortable({disabled})`、不挂 listeners、`onDragEnd` 直接 return；`onChange` 不触发 |
| `onDragEnd` 无 `over` / 原地放下 | 不调用 `onChange`，只转发逃生舱回调 |
| `keyExtractor` 产出的 id 重复 | 不额外校验（与 react-list 一致），由使用者保证唯一；文档标注 |
| `handleOnly=true` 但 slot 没 spread `dragHandleProps` | 列表不可拖 —— 文档写明为硬性约定（dnd-kit 固有约束，不做运行时检测） |
| 内部 `onDragEnd` 被逃生舱覆盖 | 强制内部接管，`dndContextProps.onDragEnd` 作为**前置回调**转发，不会掐掉排序 |

### 不做的事（YAGNI）

多列跨容器拖拽、`DragOverlay`、`onDragStart` / `onDragCancel` 顶层 prop（走 `dndContextProps`）、内置样式主题（只给最小 reset + `.is-dragging`）、`SELF` / `INDEX` 之外的 key 策略。

### 风险提示

- `handleOnly=true` 时，如果 slot 不渲染并 spread `dragHandleProps`，列表完全拖不动 —— 这是 API 的硬性约定，必须在 README / llms.txt 中显著标注。
- 不使用 `DragOverlay` 时，拖起元素仍受根容器 `overflow` 影响；若使用者给容器设了 `overflow: hidden`，拖到边缘会被裁切。文档里说明可用 `dndContextProps.modifiers` 或自行加 DragOverlay（本库不内置）。
- `getKey` 产出的 id 若重复，dnd-kit 的 `SortableContext` 行为未定义；由使用者保证唯一。

## 6. 测试策略

现有 jest 27 + ts-jest + @testing-library/react 12。`__tests__/index.spec.tsx` 现有断言 "Enjoy coding" 会失效，需重写。

1. 渲染 3 条数据 → 断言 3 个 `.react-dnd-list__item`、根 class 含 `react-dnd-list` 与自定义 `className` / `classNames.root`。
2. 空状态：有 / 无 `slots.empty` 两种渲染。
3. `classNames` 合并：`item` class 生效；`dragging` 通过断言 `useSortable` 的 `isDragging` 接线存在（jsdom 不模拟真实拖拽）。
4. `handleOnly`：false 时 wrapper 带 `role` / `aria-*` 与 dnd-kit listeners 痕迹；true 时 wrapper 无 `aria-roledescription`，`dragHandleProps` 内含 `onPointerDown` 与 `ref`。
5. 排序逻辑：把 `onDragEnd` 抽成可单测的纯函数 `reorder(value, ids, activeId, overId) => T[]`，直接测 `arrayMove` 结果（不依赖 jsdom 模拟拖拽）。
6. `disabled` / `onChange` 不被误触发的用例。

dnd-kit 的 `PointerSensor` 在 jsdom 里无法真实模拟拖拽，所以**不写「拖拽后 DOM 顺序变化」的集成测试**，改测 `reorder` 纯函数 + 回调接线。真实交互验证放到 demo（`public/src/app.tsx`）里人工确认。

## 7. 改动清单

| 文件 | 动作 |
|---|---|
| `package.json` | 加 4 个 dependencies；react/react-dom 移入 peerDependencies；devDependencies 保留一份供本地开发 |
| `rollup.config.js` | `globals` 补 `@dnd-kit/*`、`@jswork/react-list` 的 UMD 全局名（deps 已 external） |
| `src/components/types.ts` | 新建，§3 全部类型 |
| `src/components/index.tsx` | 重写为函数组件（class → FC），内联 `SortableRow` |
| `src/components/index.fc.tsx` | 删除 |
| `src/components/style.scss` | 补最小 reset 与拖拽态 |
| `src/main.ts` | 具名导出 + 转出 `SELF` / `INDEX` |
| `public/src/app.tsx` | 换成受控 demo（3~4 条数据 + 手柄 + `handleOnly` 开关） |
| `__tests__/index.spec.tsx` | 重写 §6 用例 |
| `README.md` / `llms.txt` | 同步新 API、用法、注意事项 |
| `.gitignore` | 加 `.superpowers`（本轮已改） |

## 8. 成功标准

- `pnpm build` 产出 `dist/index.js` + `dist/style.css` + 类型声明。
- `pnpm test` 全绿。
- `pnpm dev` 打开 demo 能真实拖动手柄 / 整行重排。
- `README.md` 与 `llms.txt` 与实现一致。

## 9. 参考

- https://github.com/afeiship/react-list
- https://docs.dndkit.com/
- `docs/superpowers/specs/` 下的本文件
