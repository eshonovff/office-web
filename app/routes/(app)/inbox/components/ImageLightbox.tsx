import { useRef, useState, type PointerEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog';
import { useHistoryBackedDialog } from '~/hooks/useHistoryBackedDialog';
import { cn } from '~/lib/utils';

const SWIPE_CLOSE_THRESHOLD_PX = 120;

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  alt: string;
}

export function ImageLightbox({ open, onOpenChange, src, alt }: ImageLightboxProps) {
  const requestClose = useHistoryBackedDialog(open, () => onOpenChange(false));
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Only touch drags dismiss — a stray mouse drag on desktop shouldn't close the viewer.
    if (event.pointerType !== 'touch') return;
    draggingRef.current = true;
    startYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const delta = event.clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (dragY > SWIPE_CLOSE_THRESHOLD_PX) {
      requestClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
      <DialogContent
        className={cn(
          'top-0 left-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'sm:top-1/2 sm:left-1/2 sm:h-auto sm:w-auto sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-4 sm:rounded-xl sm:p-2 sm:pt-2 sm:pb-2'
        )}>
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {src && (
          <div
            className="flex h-full w-full touch-none items-center justify-center"
            style={{
              transform: `translateY(${dragY}px)`,
              opacity: 1 - Math.min(dragY / 400, 0.6),
              transition: draggingRef.current ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}>
            <img src={src} alt={alt} className="max-h-[90dvh] max-w-full rounded-md object-contain sm:max-h-[80dvh]" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
