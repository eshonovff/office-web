import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface NodeShellProps {
  icon: ReactNode;
  title: string;
  accentClassName: string;
  selected?: boolean;
  hasTarget?: boolean;
  outputs: { id: string; label: string }[];
  children: ReactNode;
}

// Shared visual shell for all 4 node types (message/condition/action/note) — a small
// summary card with a target handle on the left (any node but Note can be a link's
// destination) and one labeled, individually-positioned source handle per output row
// on the right (ниг. flowGraph.ts getOutputPorts for what each type offers).
export function NodeShell({
  icon,
  title,
  accentClassName,
  selected,
  hasTarget = true,
  outputs,
  children,
}: NodeShellProps) {
  return (
    <div
      className={cn(
        'bg-sidebar relative w-56 rounded-lg border-2 shadow-sm',
        selected ? 'border-primary' : 'border-border'
      )}>
      {hasTarget && <Handle type="target" position={Position.Left} className="!bg-muted-foreground !h-2.5 !w-2.5" />}

      <div className="border-border flex items-center gap-2 rounded-t-lg border-b px-3 py-2">
        <span className={accentClassName}>{icon}</span>
        <span className="truncate text-sm font-semibold">{title}</span>
      </div>

      <div className="text-muted-foreground text-2xs space-y-1.5 p-3">{children}</div>

      {outputs.length > 0 && (
        <div className="border-border border-t">
          {outputs.map((output) => (
            <div
              key={output.id}
              className="border-border text-2xs relative flex items-center justify-end border-b px-3 py-1.5 last:rounded-b-lg last:border-b-0">
              <span className="truncate">{output.label}</span>
              <Handle type="source" position={Position.Right} id={output.id} className="!bg-primary !h-2.5 !w-2.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
