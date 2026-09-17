import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { useState } from 'react';

interface DeletableEdgeData extends Record<string, unknown> {
  onDelete?: (edgeId: string) => void;
}

// Хати пайванд бо тугмаи "X"-и delete, ки ҳангоми ҳовер намоён мешавад (алгуи ChatPlace) —
// пеш аз ин, нест кардани хат маҷбур мекард аввал онро клик карда интихоб кунӣ, баъд Delete/
// Backspace-и клавиатура занӣ, бе ҳеҷ ишораи визуалӣ дар canvas худаш. onDelete аз FlowCanvas
// тавассути data мегузарад (на context) — то ҳар хат мустақилона funksияи худро дошта бошад.
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const onDelete = (data as DeletableEdgeData | undefined)?.onDelete;

  return (
    <>
      {/* Роҳи васеи ноаён барои ҳовери осонтар — хати аслӣ хеле борик аст. */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {hovered && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan border-border bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive absolute flex h-5 w-5 items-center justify-center rounded-full border shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onDelete?.(id)}>
            <X className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
