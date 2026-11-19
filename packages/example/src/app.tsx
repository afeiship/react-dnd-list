import { useState } from 'react';
import ReactDndList, { SELF } from '@jswork/react-dnd-list';
import type { SortableItemContext } from '@jswork/react-dnd-list';
import '@jswork/react-dnd-list/style.css';

type Item = { id: string; name: string };
const initial: Item[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Carol' },
];

const itemSlot = ({ item, dragHandleProps }: SortableItemContext<Item>) => (
  <div className="flex items-center gap-2 border-b py-2">
    <button {...dragHandleProps} className="cursor-grab px-2">⠿</button>
    <span>{item.name}</span>
  </div>
);

function App() {
  const [list, setList] = useState(initial);
  return (
    <div className="m-10 p-4 shadow bg-gray-100 text-gray-800">
      <div className="badge badge-warning absolute right-0 top-0 m-4">
        Build Time: {BUILD_TIME}
      </div>
      <ReactDndList value={list} onChange={setList} slots={{ item: itemSlot }} />
    </div>
  );
}

export default App;
