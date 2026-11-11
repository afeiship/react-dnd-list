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
  const [fruits, setFruits] = useState(['apple', 'banana', 'cherry']);

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
          value={fruits}
          keyExtractor={SELF}
          className="flex flex-col gap-1"
          classNames={{ item: 'p-2 bg-white rounded shadow text-sm' }}
          onChange={setFruits}
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
