import { BoardColumn } from './BoardColumn';
import type { BoardColumnWithTasks } from '~/types/task';

interface BoardProps {
  columns: BoardColumnWithTasks[];
}

export function Board({ columns }: BoardProps) {
  return (
    <div className="scrollbar-thin flex flex-1 gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <BoardColumn key={column.id} column={column} />
      ))}
    </div>
  );
}
