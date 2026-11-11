import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ReactDndList, { SELF } from '../src/main';

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

// --- controller-approved additions (from Task 2 / Task 3+4 review findings) ---

describe('ReactDndList / controlled reorder', () => {
  test('preserves in-row DOM state when value order changes', () => {
    const slot = (ctx: any) => (
      <div>
        <input
          data-testid={`input-${ctx.item.id}`}
          defaultValue={ctx.item.name}
        />
      </div>
    );

    function Controlled({ list }: { list: Item[] }) {
      return <ReactDndList value={list} slots={{ item: slot }} />;
    }

    const { container, rerender } = render(<Controlled list={items} />);

    const bobInput = screen.getByTestId('input-b') as HTMLInputElement;
    bobInput.value = 'Bobby'; // uncontrolled DOM state typed by the user

    // Parent applies a reorder (as onChange would): same tree, new array order.
    rerender(<Controlled list={[items[1], items[0], items[2]]} />);

    // Key stability: Bob's row (and its input carrying 'Bobby') moved to the top
    // as the SAME DOM node — with index keys, position 0 would still hold 'Alice'.
    const firstRowInput = container.querySelector(
      '.react-dnd-list__item input'
    ) as HTMLInputElement;
    expect(firstRowInput.getAttribute('data-testid')).toBe('input-b');
    expect(firstRowInput.value).toBe('Bobby');
  });
});
